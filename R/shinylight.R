globals <- new.env(parent = emptyenv())

#' Sends a progress update to the client.
#'
#' During a slow remote procedure call, call this to inform the client of
#' progress.
#' @param numerator The progress, out of [denominator]
#' @param denominator What the progress is out of. You could use this for the
#' number of known items to be completed so that each call increases either
#' the numerator (for more items done) and/or the denominator (for more items
#' discovered that need to be done). However, it is not necessary to do this,
#' you can reduce the numerator if you want.
#' @export
sendProgress <- function(numerator, denominator=1) {
  globals$ws$send(jsonlite::toJSON(list(
    type = "progress",
    id = globals$id,
    numerator = numerator,
    denominator = denominator
  )))
}

#' Sends informational text to the client.
#'
#' During a slow remote procedure call, call this to inform the client of
#' progress.
#' @param text The text to send
#' @export
sendInfoText <- function(text) {
  globals$ws$send(jsonlite::toJSON(list(
    type = "info",
    id = globals$id,
    text = text
  )))
}

# Calls fn with parameters params. rparams is a list of
# parameters that are not passed to fn (like controlling
# the plot format).
processMessage <- function(fn, params, rparams) {
  tryCatch({
    if ("rrpc.resultformat" %in% names(rparams)) {
      validateAndEncodePlotAs(rparams$rrpc.resultformat, function() {
        do.call(fn, params)
      })
    } else {
      list(
        error = NULL,
        result = list(
          data = do.call(fn, params),
          plot = NULL
        )
      )
    }
  },
  error = function(e) {
    print(paste("Error:", e$message))
    print(paste("call:", format(e$call)))
    list(
      error = list(message = e$message, code = -32000),
      result = NULL
    )
  })
}

rrpc <- function(interface) { function(ws) {
  ws$onMessage(function(binary, message) {
    envelope <- tryCatch({
      df <- jsonlite::fromJSON(message)
      method <- df$method
      params <- df$params
      pnames <- names(params)
      rnames <- pnames[grep("^rrpc\\.", pnames)]
      # all parameters whos names begin with "rrpc."
      rparams <- params[rnames]
      # remove names beginning "rrpc." from params
      params[rnames] <- NULL
      fn <- interface[[method]]
      if (is.null(fn)) {
        list(
          jsonrpc = "2.0",
          id = df$id,
          error <- list(message = "no such method", code = -32601)
        )
      } else {
        globals$ws <- ws
        globals$id <- df$id
        r <- processMessage(fn, params, rparams)
        env <- list(
          jsonrpc = "2.0",
          id = df$id,
          error = r$error
        )
        # Set result only if r$result is not NULL
        env$result <- r$result
        env
      }
    }, error = function(e) {
      list(
        jsonrpc = "2.0",
        id = NA,
        error = list(message = "JSON parse error", code = -32700)
      )
    })
    ws$send(jsonlite::toJSON(envelope, force = TRUE, digits = NA))
  })
}}

#' Returns a response to a request to /lang/
getLocaleResponse <- function(req, langs) {
  al <- req$HTTP_ACCEPT_LANGUAGE
  als <- strsplit(al, ",", fixed=TRUE)[[1]]
  langPath <- c(sub(";.*", "", als), "en", langs[1])
  lang <- intersect(langPath, langs)[1]
  host <- req$HTTP_HOST
  path <- sub("^/lang/", paste0("/locales/", lang, "/"), req$PATH_INFO)
  list(
    status=307L,
    headers=list("Location"=paste0(
      req$rook.url_scheme, "://", host, req$HTTP_SCRIPT_NAME, path
    )),
    body=""
  )
}

# Split xs into a list of lists
# Each member of xs that equals sep is discarded,
# and a new member of the output list is started.
splitVector <- function(xs, sep) {
  ps <- xs == sep
  indices <- cumsum(ps)+1
  indicesNa <- ifelse(ps, NA, indices)
  split(xs, indicesNa)
}

# Turns a vector of lines into a paragraph
unlines <- function(lines) paste(lines, collapse="\n")

getMultipartFormData <- function(req, ctes) {
  boundary <- "--"
  for (cte in ctes) {
    kv <- strsplit(cte, "=")[[1]]
    if (1 < length(kv) && kv[[1]] == "boundary") {
      boundary <- paste0("--", kv[[2]])
    }
  }
  endboundary <- paste0(boundary, '--')
  lines <- req$rook.input$read_lines()
  lines <- splitVector(lines, endboundary)[[1]]
  sections <- list()
  for (section in splitVector(lines, boundary)) {
    s <- splitVector(section, '')
    if (1 < length(s)) {
      headers <- s[[1]]
      name_headers <- headers[grep('; *name="', headers)]
      if (0 < name_headers) {
        name <- sub('^.*; *name="([^""]*)".*$', "\\1", name_headers[1])
        paragraphs <- lapply(s[2:length(s)], unlines)
        body <- paste(paragraphs, collapse="\n\n")
        sections[[name]] <- body
      }
    }
  }
  sections
}

# Gets form data from request as a list
getFormData <- function(req) {
  ctes <- strsplit(req$CONTENT_TYPE, "; *")[[1]]
  if (ctes[[1]] == "multipart/form-data") {
    return(getMultipartFormData(req, ctes[2:length(ctes)]))
  }
  input <- intToUtf8(req$rook.input$read())
  sections <- list()
  for (kv in strsplit(input, "&")[[1]]) {
    kve <- strsplit(kv, "=")[[1]]
    if (1 < length(kve)) {
      k <- kve[[1]]
      v <- URLdecode(kve[[2]])
      sections[[k]] <- v
    }
  }
  sections
}

#' Get index.html with (potentially) the JSON data in `text`
#' inserted.
#'
#' @param text The text to insert as shinylight_initial_data
#' @param path File system path to the index.html file
#' @return The updated text
indexWithInit <- function(text, path) {
  if (typeof(text) != "character") {
    text <- jsonlite::toJSON(text)
  }
  escaped <- gsub("\\", "\\\\", text, fixed=TRUE)
  escaped <- gsub("\n", "\\n\\\n", escaped, fixed=TRUE)
  escaped <- gsub("'", "\\'", escaped, fixed=TRUE)
  escaped <- paste0("var shinylight_initial_data='\\\n", escaped, "';")
  body <- readLines(path)
  unlines(ifelse(
    grepl("\\bshinylight_initial_data[ \\t]*=", body),
    escaped,
    body
  ))
}

#' Get the response to a POST to /init
#' This is index.html with (potentially) the JSON data
#' from the 'data' parameter inserted.
#'
#' @param req The httpuv request object
#' @param path File system path to the index.html file
#' @return The httpuv response object
getInitResponse <- function(req, path) {
  # take post data and fire it back as a cookie
  sections <- getFormData(req)
  if (is.null(sections$data)) {
    return (list(
      status=400L,
      headers=list(),
      body="Need a POST request with a 'data' form parameter"
    ))
  }
  return(list(
    status=200L,
    headers=list(),
    body=indexWithInit(sections$data, path)
  ))
}

#' Makes and starts a server for serving R calculations
#'
#' It will serve files from the app directories specified by appDirs.
#' If a file is requested that is not in one of those directories, the
#' files in Shinylight's own inst/www directory will be served.
#' Some paths have special meanings: \code{/} returns
#' \code{/index.html}, \code{/lang/} is redirected to
#' \code{/locales/<language-code>/} depending
#' on the language selected in the request's Accept-Language
#' header (that is, the browser's language setting) and the
#' availability of the file requested. A POST request to \code{/init}
#' with a \code{data} parameter will return \code{/index.html}, except
#' that if the file has a line containing \code{shinylight_initial_data =}
#' then this line with be replaced with a line initializing
#' \code{shinylight_initial_data} to the data passed. This is used in
#' \code{shinylight-framework} to permit linking to a framework app
#' with specific data preloaded -- the text should be as is downloaded
#' with the "Save Data" button. Of course, this is available to
#' non-framework apps, too.
#' @param interface List of functions to be served. The names of the elements
#' are the names that the client will use to call them.
#' @param host Interface to listen on (default is \code{'0.0.0.0'}, that
#' is, all interfaces)
#' @param port Port to listen on
#' @param appDirs List of directories in which to find static files to serve
#' @param root Root of the app on the server (with trailing slash)
#' @param initialize A json string or list (that will be converted to a
#' JSON string) to be passed to the JavaScript as initial data. For
#' non-framework apps, the index.html must contain a line containing
#' \code{var shinylight_initial_data=}, which will be replaced with
#' code that sets \code{shinylight_initial_data} to this supplied JSON
#' string.
#' @return The server object, can be passed to \code{\link{slStop}}
#' @export
rrpcServer <- function(
    interface,
    host='0.0.0.0',
    port=NULL,
    appDirs=NULL,
    root="/",
    initialize=NULL) {
  paths <- list()
  paths[[paste0(root, "lang")]] <- httpuv::excludeStaticPath()
  paths[[paste0(root, "init")]] <- httpuv::excludeStaticPath()
  existingFiles <- list()
  for(appDir in appDirs) {
    files <- list.files(appDir, recursive=TRUE)
    for (file in setdiff(files, existingFiles)) {
      paths[[paste0(root,file)]] <- file.path(appDir, file)
    }
    existingFiles <- union(existingFiles, files)
  }
  app <- list(onWSOpen=rrpc(interface))
  app$staticPaths <- paths
  langs <- list.dirs(path=file.path(appDir, "locales"),
    full.names=FALSE,
    recursive=FALSE
  )
  app$call <- function(req) {
    path.elements <- strsplit(req$PATH_INFO, '/', fixed=T)[[1]]
    if (length(path.elements) < 2) {
      index.path <- paths[["/index.html"]]
      return(list(
        status=200L,
        headers=list(),
        body=if (is.null(initialize))
          unlines(readLines(index.path))
          else indexWithInit(initialize, index.path)
      ))
    }
    first = path.elements[2]
    if (first == 'lang') {
      return (getLocaleResponse(req, langs))
    } else if (first == 'init') {
      return (getInitResponse(req, paths[["/index.html"]]))
    }
    list (
      status=404L,
      body="Unknown"
    )
  }
  if (is.null(port)) {
    port <- httpuv::randomPort(min=8192, max=40000, host=host)
  }
  httpuv::startServer(host=host, port=port, app=app)
}

#' Obtains the address that the server is listening on
#' @param server The server (returned by \code{\link{slServer}}
#' or \code{\link{slRunRServer}})
#' @return The HTTP address as \code{protocol://address:port}
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

closeAllDevices <- function() {
  cur <- grDevices::dev.cur()
  while (cur != 1) {
    grDevices::dev.off(which = cur)
    cur <- grDevices::dev.cur()
  }
}

#' Renders a plot as a base64-encoded image
#'
#' @param device Graphics device function, such as
#' \code{\link[grDevices:png]{grDevices::png}} or
#' \code{\link[grDevices:pdf]{grDevices::pdf}}
#' @param mimeType Mime type for the data produced by \code{device}
#' @param width Width of the plot in units applicable to \code{device}
#' @param height Height of the plot in units applicable to \code{device}
#' @param plotFn Function to call to perform the plot
#' @return list with two keys, whose values can each be NULL:
#' \code{'plot'} is a plot in HTML img src form and \code{'data'} is a
#' data frame or other non-plot result.
#' @export
encodePlot <- function(device, mimeType, width, height, plotFn) {
  tempFilename <- tempfile(pattern='plot', fileext='.tmp')
  closeAllDevices()
  options(device = function() {
    device(
      file = tempFilename,
      width = as.numeric(width),
      height = as.numeric(height)
    )
  })
  data <- plotFn()
  plot <- NULL
  if (grDevices::dev.cur() != 1) {
    grDevices::dev.off()
    fileSize <- file.size(tempFilename)
    if (!is.na(fileSize)) {
      raw <- readBin(tempFilename, what="raw", n=fileSize)
      plot <- paste0("data:", mimeType, ";base64,", jsonlite::base64_enc(raw))
    }
  }
  list(plot=plot, data=data)
}

validateAndEncodePlotAs <- function(format, plotFn) {
  if (!is.list(format)) {
    list(
      result=NULL,
      error="rrpc.resultformat specified but not as {type=[,height=,width=]}"
    )
  } else {
    valid <- c('pdf', 'png', 'svg', 'csv')
    if (format$type %in% valid) {
      r <- encodePlotAs(format, plotFn)
      list(result=r, error=NULL)
    } else {
      validCount <- length(valid)
      errorText <- paste(
        "rrpc.resultformat type should be",
        paste(valid[1:validCount-1]),
        "or", valid[validCount]
      )
      list(result=NULL, error=errorText)
    }
  }
}

#' Renders a plot as a base64-encoded PNG
#'
#' The result can be set as the \code{src} attribute of an \code{<img>}
#' element in HTML.
#'
#' @param format An object specifying the output, with the following members:
#' format$type is \code{"png"}, \code{"pdf"} or \code{"csv"}, and
#' \code{format$width} and \code{format$height} are
#' the dimensions of the PDF (in inches) or PNG (in pixels) if appropriate.
#' @param plotFn Function to call to perform the plot
#' @return list with two keys, whose values can each be NULL:
#' \code{'plot'} is a plot in HTML img src form and \code{'data'} is a
#' data frame or other non-plot result.
#' @seealso \code{\link{rrpcServer}}
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
  } else if (format$type == "svg") {
    encodePlot(grDevices::svg, "image/svg+xml",
        format$width, format$height, plotFn)
  } else if (format$type == "pdf") {
    encodePlot(grDevices::pdf, "application/pdf",
        format$width, format$height, plotFn)
  } else {
    stop(paste("Did not understand plot type", type))
  }
}

#' Encodes a data frame as a CSV file to be downloaded
#' @param results Data frame to be returned
#' @export
downloadCsv <- function(results) {
    forJson <- list()
    forJson$action <- "download"
    forJson$filename <- "results.csv"
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
        stop(
          paste0("non-whitelisted names used: ", txt),
          call.=FALSE,
          domain=NA
        )
    }
    callback(com)
}

#' Returns a function that runs an R command
#'
#' If you set this as a part of your interface, like:
#' `runR=shinylight::runR(c("+", "plot", "c", "x", "y"))`
#' then you can call it from Javascript like this:
#' ```
#' rrpc.call("runR", {
#'  Rcommand:"2+2"
#' }, function(x) {console.log(x);});
#' rrpc.call("runR", {
#'  Rcommand:"y<-c(2,0,1);plot(c(1,2,3),y);y",
#'  'rrpc.resultformat': {
#'    type: 'png',
#'    width: 200,
#'    height: 300,
#'  }
#' }, function(x) {img.setAttribute('src', x.plot[0])});
#' ```
#' @param symbolList A list of permitted symbols in the R command
#' @export
#' @md
runR <- function(symbolList) {
  function(data=NA, Rcommand, width=7, height=7, timeout=2000) {
    sanitizeCommand(Rcommand, symbolList, function(com) {
      setTimeLimit(elapsed=timeout)
      on.exit({
        setTimeLimit(elapsed=Inf)
      })
      eval(com)
    })
  }
}

#' Stops a ShinyLight GUI
#'
#' @param server The server (returned by \code{\link{slServer}}
#' or \code{\link{slRunRServer}})
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
#' @seealso slRunRServer
#' @seealso slStop
#' @param appDir Directory containing files to serve (for example
#' system.file("www", package = "your-package"))
#' @param interface List of functions you want to be able to call from
#' the browser. If you want to use the Shinylight Framework, this should
#' have one member \code{getSchema}. For details of this, see the
#' documentation for [shinylightFrameworkStart].
#' @param host IP address to listen on, default is '127.0.0.1'
#' (localhost). Use '0.0.0.0' to run in a docker container.
#' @param port Internet port of the virtual server. If not defined, a
#' random free port will be chosen and the browser will be opened
#' to show the GUI.
#' @param daemonize If TRUE, keep serving forever without returning.
#' This is useful when called from \code{RScript}, to keep
#' @param initialize A json string or list (that will be converted to a
#' JSON string) to be passed to the JavaScript as initial data. For
#' non-framework apps, the index.html must contain a line containing
#' \code{var shinylight_initial_data=}, which will be replaced with
#' code that sets \code{shinylight_initial_data} to this supplied JSON
#' string.
#' @return server object, unless daemonize is TRUE.
#' @export
slServer <- function(
    interface,
    appDir=NULL,
    host='127.0.0.1',
    port=NULL,
    daemonize=FALSE,
    initialize=NULL) {
  slDir <- system.file("www", package = "shinylight")
  if (is.null(appDir)) {
    appDirList <- list(slDir)
  } else {
    appDirList <- list(appDir, slDir)
  }
  s <- rrpcServer(host=host, port=port, appDirs=appDirList, root="/",
    interface=interface, initialize=initialize
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

#' Start a ShinyLight server which runs R that it is sent
#' @seealso slServer
#' @seealso slStop
#' @param appDir Directory containing files to serve (for example
#' system.file("www", package = "your-package"))
#' @param permittedSymbols List of symbols that are permitted in the R
#' commands passed. Remember to include \code{data}, \code{$} and
#' \code{<-}.
#' @param host IP address to listen on, default is '127.0.0.1'
#' (localhost). Use '0.0.0.0' to run in a docker container.
#' @param port Internet port of the virtual server. If not defined, a
#' random free port will be chosen and the browser will be opened
#' to show the GUI.
#' @param daemonize If TRUE, keep serving forever without returning.
#' This is useful when called from \code{RScript}, to keep
#' @return server object, unless daemonize is TRUE.
#' @param initialize A json string or list (that will be converted to a
#' JSON string) to be passed to the JavaScript as initial data. For
#' non-framework apps, the index.html must contain a line containing
#' \code{var shinylight_initial_data=}, which will be replaced with
#' code that sets \code{shinylight_initial_data} to this supplied JSON
#' string.
#' @export
slRunRServer <- function(
    permittedSymbols,
    appDir=NULL,
    host='127.0.0.1',
    port=NULL,
    daemonize=FALSE,
    initialize=NULL) {
  slServer(
    host=host,
    port=port,
    appDir=appDir,
    daemonize=daemonize,
    initialize=initialize,
    interface=list(
      runR=runR(permittedSymbols)
    )
  )
}
