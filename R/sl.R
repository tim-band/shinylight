rrpc <- function(interface) { function(ws) {
  ws$onMessage(function(binary, message) {
    df <- jsonlite::fromJSON(message);
    method <- df$method
    params <- df$params
    pnames <- names(params)
    rnames <- pnames[grep("^rrpc\\.", pnames)]
    # all parameters whos names begin with "rrpc."
    rparams <- params[rnames]
    # remove names beginning "rrpc." from params
    params[rnames] <- NULL
    envelope <- list()
    envelope$jsonrpc <- "2.0"
    envelope$id <- df$id
    if (is.null(interface[[method]])) {
      envelope$error <- "no such method"
      envelope$result <- NULL
    } else {
      r <- tryCatch(
        withCallingHandlers(
          if ("rrpc.resultformat" %in% rnames) {
            result <- encodePlotAs(rparams$rrpc.resultformat, function() {
              do.call(interface[[method]], params)
            })
            list(error=NULL, result=result)
          } else {
            list(error=NULL,
              result=list(
                data=do.call(interface[[method]], params),
                plot=NULL
              )
            )
          },
          error=function(e) {
            error <- list(message = e$message,
                call = format(e$call),
                stack = format(sys.calls()))
            list(error=error, result=NULL)
          }
        ),
        error=function(err) {
          print(err);
          list(error=err$message, result=NULL)
        }
      )
      envelope$result <- r$result
      envelope$error <- r$error
    }
    ws$send(jsonlite::toJSON(envelope, force=TRUE))
  })
}}

#' Makes and starts a server for serving R calculations
#'
#' @param interface List of functions to be served. The names of the elements
#' are the names that the client will use to call them.
#' @param host Interface to listen on (default is '0.0.0.0', that is, all interfaces)
#' @param port Port to listen on
#' @param appDirs List of directories in which to find static files to serve
#' @param root Root of the app on the server (with trailing slash)
#' @return The server object, can be passed to [slStop]
#' @export
rrpcServer <- function(interface, host='0.0.0.0', port=NULL, appDirs=NULL, root="/") {
  paths <- list()
  paths[[paste0(root, "lang")]] <- httpuv::excludeStaticPath()
  existingFiles <- list()
  for(appDir in appDirs) {
    files <- list.files(appDir, recursive=TRUE)
    for (file in setdiff(files, existingFiles)) {
      paths[[paste0(root,file)]] <- file.path(appDir, file)
      if (file == "index.html" && !(root %in% names(paths))) {
        paths[[root]] <- file.path(appDir, file)
      }
    }
    existingFiles <- union(existingFiles, files)
  }
  app <- list(onWSOpen=rrpc(interface))
  app$staticPaths <- paths
  langs <- list.dirs(path=file.path(appDir, "locales"),
    full.names=FALSE,
    recursive=FALSE
  )
  lang <- 'en'
  app$call <- function(req) {
    al <- req$HTTP_ACCEPT_LANGUAGE
    als <- strsplit(al, ",", fixed=TRUE)[[1]]
    langPath <- c(sub(";.*", "", als), "en", langs[1])
    lang <- intersect(langPath, langs)[1]
    host <- req$HTTP_HOST
    path <- sub("^/lang/", paste0("/locales/", lang, "/"), req$PATH_INFO)
    list(
      status=307L,
      headers=list("Location"=paste0(req$rook.url_scheme, "://", host, req$HTTP_SCRIPT_NAME, path)),
      body=""
    )
  }
  if (is.null(port)) {
    port <- httpuv::randomPort(min=8192, max=40000, host=host)
  }
  httpuv::startServer(host=host, port=port, app=app)
}

#' Obtains the address that the server is listening on
#' 
#' @return protocol://address:port
getAddress <- function(server) {
  host <- server$getHost()
  port <- server$getPort()
  protocol <- "http://"
  if (grepl("://", host, fixed=TRUE)) {
    protocol <- ""
  }
  paste0(protocol, host, ":", port)
}

#' Opens a browser to look at the server
#' 
#' @param server The server to browse to
browseTo <- function(server) {
  utils::browseURL(getAddress(server))
}

#' Renders a plot as a base64-encoded image
#'
#' @param device Graphics device function, such as [grDevices::png]
#'   or [grDevices::pdf]
#' @param mimeType Mime type for the data produced by `device`
#' @param width Width of the plot in units applicable to `device`
#' @param height Height of the plot in units applicable to `device`
#' @param plotFn Function to call to perform the plot
#' @return list with two keys, whose values can each be NULL:
#' 'plot' is a plot in HTML img src form and 'data' is a data frame or other
#' non-plot result.
#' @seealso [encodePlotAsPng()]
#' @seealso [encodePlotAsPdf()]
#' @export
encodePlot <- function(device, mimeType, width, height, plotFn) {
  tempFilename <- tempfile(pattern='plot', fileext='.tmp')
  device(file=tempFilename, width=as.numeric(width), height=as.numeric(height))
  data <- plotFn()
  plot <- NULL
  grDevices::dev.off()
  fileSize <- file.size(tempFilename)
  if (!is.na(fileSize)) {
    raw <- readBin(tempFilename, what="raw", n=fileSize)
    plot <- paste0("data:", mimeType, ";base64,", jsonlite::base64_enc(raw))
  }
  list(plot=plot, data=data)
}

#' Renders a plot as a base64-encoded PNG
#'
#' The result can be set as the `src` attribute of an `img` element in HTML.
#'
#' @param format An object specifying the output, with the following members:
#' format$type is "png", "pdf" or "csv", and format$width and format$height are
#' the dimensions of the PDF (in inches) or PNG (in pixels) if appropriate.
#' @param plotFn Function to call to perform the plot
#' @return list with two keys, whose values can each be NULL:
#' 'plot' is a plot in HTML img src form and 'data' is a data frame or other
#' non-plot result.
#' @seealso [rrpcServer()]
#' @export
encodePlotAs <- function(format, plotFn) {
  type <- format$type
  if (is.null(type)) {
    stop("plot type not defined")
  }
  if (format$type == "csv") {
    downloadCsv(plotFn())
  } else if (format$type == "png") {
    encodePlot(grDevices::png, "image/png",
        format$width, format$height, plotFn)
  } else if (format$type == "pdf") {
    encodePlot(grDevices::pdf, "application/pdf",
        format$width, format$height, plotFn)
  } else {
    stop(paste("Did not understand plot type", type))
  }
}

#' Encodes a data frame as a CSV file to be downloaded
#' @export
downloadCsv <- function(results) {
    forJson <- list()
    forJson$action <- "download"
    forJson$filename <- paste0(name, ".csv")
    raw <- utils::capture.output(utils::write.csv(results, stdout()))
    forJson$data <- paste0(
        "data:text/csv;base64,",
        jsonlite::base64_enc(raw))
    forJson
}

# Finds all names in an expression
# but the result needs flattening
findNames <- function(exp) {
  # don't care about is.atomic
  if (is.name(exp)) {
    exp
  } else if (is.pairlist(exp)) {
    Map(findNames, exp)
  } else if (is.call(exp)) {
    if ("::" == exp[[1]] && is.name(exp[[2]]) && is.name(exp[[3]])) {
      paste0(exp[2], "::", exp[3])
    } else {
      Map(findNames, exp)
    }
  }
}

nameCheck <- function(exps, allowed) {
  symbls <- unlist(Map(findNames, exps))
  nams <- unique(Map(as.character, symbls))
  setdiff(nams, allowed)
}

sanitizeCommand <- function(command, symbolList, callback) {
    com <- parse(text=command)
    failures <- nameCheck(com, symbolList)
    if (0 < length(failures)) {
        txt <- paste(failures, collapse=", ")
        stop(paste0("non-whitelisted names used: ", txt), call.=FALSE, domain=NA)
    }
    callback(com)
}

#' Returns a function that runs an R command
#'
#' If you set this as a part of your interface, like:
#' runR=shinylight::runR(c("+", "plot", "c", "x", "y"))
#' then you can call it from Javascript like this:
#'
#' rrpc.call("runR", {
#'  Rcommand:"2+2"
#' }, function(x) {console.log(x);});
#'
#' rrpc.call("runR", {
#'  Rcommand:"y<-c(2,0,1);plot(c(1,2,3),y);y",
#'  format:"png",
#'  width:200,
#'  height:300
#' }, function(x) {console.log(x.data.data,x.data.plot[0]);});
#'
#' @param symbolList A list of permitted symbols in the R command
#' @export
runR <- function(symbolList) {
  function(data, Rcommand, format=NA, width=7, height=7, timeout=2000) {
    sanitizeCommand(Rcommand, symbolList, function(com) {
      print(com)
      setTimeLimit(elapsed=timeout)
      on.exit({
        setTimeLimit(elapsed=Inf)
      })
      if (is.na(format)) {
        return(eval(com))
      }
      fmt = list(type=format, width=width, height=height)
      return(encodePlotAs(fmt, function() { eval(com) }))
    })
  }
}

#' Stops a ShinyLight GUI
#'
#' @param server The server (returned by \code{\link{shinylight::slServer()}})
#' to stop. If not supplied all servers will be stopped.
#' @export
slStop <- function(server=NULL) {
  if (is.null(server)) {
    httpuv::stopAllServers()
  } else {
    server$stop()
  }
}

#' Start a ShinyLight server
#' @param appDir Directory containing files to serve (for example
#' system.file("www", package = "your-package"))
#' @param interface List of functions you want to be able to call from
#' the browser
#' @param host IP address to listen on, default is 0.0.0.0 (all interfaces)
#' @param port Internet port of the virtual server. If not defined, a
#' random free port will be chosen and the browser will be opened
#' to show the GUI.
#' @param daemonize If TRUE, keep serving forever without returning.
#' This is useful when called from RScript, to keep
#' @return server object, unless daemonize is TRUE.
#' @export
slServer <- function(appDir, interface, host='0.0.0.0', port=NULL, daemonize=FALSE) {
  slDir <- system.file("www", package = "shinylight")
  s <- rrpcServer(host=host, port=port, appDir=list(appDir, slDir), root="/",
    interface=interface
  )
  extraMessage <- ""
  if (is.null(port)) {
    browseTo(s)
    extraMessage <- "Call ShinyLight::slStop() to stop serving\n"
  }
  cat(sprintf("Listening on %s:%d\n%s", host, port, extraMessage))
  if (daemonize) {
    while (TRUE) {
      later::run_now(9999)
    }
  }
  invisible(s)
}
