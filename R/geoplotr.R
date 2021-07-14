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

rrpcServer <- function(interface, host='0.0.0.0', port=NULL, appDirs=NULL, root="/") {
  existingFiles <- list()
  paths <- list("/lang"=httpuv::excludeStaticPath())
  paths[[root]] <- appDirs[[1]]
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

#' Encodes a data frame as a CSV file to be donwloaded
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

#' Stops a ShinyLight GUI
#'
#' @param server The server (returned by \code{\link{GeoplotRgui::GeoplotR()}})
#' to stop. If not supplied all servers will be stopped.
#' @examples
#' # s <- GeoplotR()
#' # stopGeoplotR(s)
#' @export
slStop <- function(server=NULL) {
  if (is.null(server)) {
    httpuv::stopAllServers()
  } else {
    server$stop()
  }
}

dataEnvironment <- new.env(parent=emptyenv())

fetchTestData <- function() {
  if (!exists("test", dataEnvironment)) {
    data(test, package='GeoplotR', envir=dataEnvironment);
  }
}

fetchCathData <- function() {
  if (!exists("cath", dataEnvironment)) {
    data(cath, package='GeoplotR', envir=dataEnvironment);
  }
}

getColumn <- function(column) {
  fetchTestData()
  get("test", dataEnvironment)[,column]
}

getCathColumn <- function(column) {
  fetchCathData()
  cath <- get("cath", dataEnvironment)
  cascades <- cath$affinity=='ca'
  cath[[column]][cascades]
}

functions <- list(
  TiZrY=list(
    params=list(
      Ti="Ti",
      Zr="Zr",
      Y="Y",
      #units="tizry_units",
      type="tizry_type",
      plot="tizry_plot"
    ),
    optiongroups=c("plot", "plot_chr")
  ),
  TAS=list(
    params=list(
      Na2O="Na2O",
      K2O="K2O",
      SiO2="SiO2",
      volcanic="volcanic"
    ),
    optiongroups=c("plot", "plot_col")
  ),
  AFM=list(
    params=list(
      A="A",
      F="F",
      M="M",
      ternary="ternaryLogratio",
      radial="radial",
      bty="boxType",
      bw="bandwidth",
      decision="vermeeschPease",
      dlty="decisionLineType",
      dlwd="decisionLineWidth",
      dcol="decisionLineColour"
    ),
    optiongroups=c("plot", "plot_chr", "plot_col")
  )
)

params <- list(
  # TAS
  Na2O=list(type="weightCol", data="Na2O"),
  K2O=list(type="weightCol", data="K2O"),
  SiO2=list(type="weightCol", data="SiO2"),
  volcanic=list(type="b", data="true"),
  # TiZrY
  Ti=list(type="proportionCol_TiO2", data="Ti"),
  Zr=list(type="proportionCol_ZrO2", data="Zr"),
  Y=list(type="proportionCol_Y2O3", data="Y"),
  tizry_units=list(type="subheader", data="tizry_units"),
  tizry_type=list(type="tizry_type", data="tizry_type"),
  tizry_plot=list(type="tizry_plot", data="tizry_plot"),
  # AFM
  A=list(type="weightCol", data="A"),
  F=list(type="weightCol", data="F"),
  M=list(type="weightCol", data="M"),
  ternaryLogratio=list(type="b", data="true"),
  radial=list(type="b", data="false"),
  boxType=list(type="boxType", data="n"),
  bandwidth=list(type="bandwidth", data="bandwidth"),
  vermeeschPease=list(type="b", data="true"),
  decisionLineType=list(type="u8", data="decisionLineType"),
  decisionLineWidth=list(type="u8", data="decisionLineWidth"),
  decisionLineColour=list(type="color", data="decisionLineColour")
)

optiongroups <- list(
  plot=list(
    cex=list(type="f"),
    lwd=list(type="u8")
  ),
  plot_chr=list(
    bg=list(type="color", initial='#666'),
    pch=list(type="u8")
  ),
  plot_col=list(
    col=list(type="color", initial='#000')
  ),
  framework=list(
    autorefresh=list(type="b", initial=FALSE)
  )
)

types <- list(
  tizry_plot=list(
    kind="enum",
    values=c("none", "ternary", "logratio")
  ),
  tizry_type=list(
    kind="enum",
    values=c("LDA", "QDA", "Pearce")
  ),
  proportionCol_TiO2=list(
    kind="column",
    subtype="float"#,
    #unittype="proportion_TiO2"
  ),
  proportionCol_ZrO2=list(
    kind="column",
    subtype="float"#,
    #unittype="proportion_ZrO2"
  ),
  proportionCol_Y2O3=list(
    kind="column",
    subtype="float"#,
    #unittype="proportion_Y2O3"
  ),
  proportion_TiO2=list(
    kind="enum",
    values=c("wt%", "ppm"),
    factors=c(1, GeoplotR::wtpct2ppm(1, 'TiO2'))
  ),
  proportion_ZrO2=list(
    kind="enum",
    values=c("wt%", "ppm"),
    factors=c(1, GeoplotR::wtpct2ppm(1, 'ZrO2'))
  ),
  proportion_Y2O3=list(
    kind="enum",
    values=c("wt%", "ppm"),
    factors=c(1, GeoplotR::wtpct2ppm(1, 'Y2O3'))
  ),
  weightCol=list(
    kind="column",
    subtype="float"
  ),
  boxType=list(
    kind="enum",
    values=c("o", "n", "7", "L", "C", "U")
  ),
  bandwidth=list(
    kind="enum",
    values=c("nrd0", "nrd", "ucv", "bcv", "SJ")
  )
)

examples <- list(
  Na2O=getColumn("Na2O"),
  K2O=getColumn("K2O"),
  SiO2=getColumn("SiO2"),
  Ti=getColumn("TiO2"),
  Zr=getColumn("Zr"),
  Y=getColumn("Y"),
  tizry_units=c("wt%", "ppm", "ppm"),
  tizry_type="LDA",
  tizry_plot="ternary",
  A=getCathColumn("Na2O") + getCathColumn("K2O"),
  F=getCathColumn("FeOT"),
  M=getCathColumn("MgO"),
  true=TRUE,
  false= FALSE,
  n = "n",
  bandwidth="nrd0",
  decisionLineType=2,
  decisionLineWidth=1.5,
  decisionLineColour="blue"
)

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
slServer <- function(appDir, interface, host='0.0.0.0', port=NULL, daemonize=FALSE) {
  s <- rrpcServer(host=host, port=port, appDir=list(appDir), root="/",
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

#' Starts the \code{GeoplotR} GUI
#'
#' Opens a web-browser with a Graphical User Interface (GUI) for the
#' \code{IsoplotR} package.
#' @param host IP address to listen on, default is 0.0.0.0 (all interfaces)
#' @param port Internet port of the virtual server. If not defined, a
#' random free port will be chosen and the browser will be opened
#' to show the GUI.
#' @param daemonize If TRUE, keep serving forever without returning.
#' This is useful when called from RScript, to keep
#' @return server object, unless daemonize is TRUE.
#' @examples
#' #GeoplotR()
#' @export
GeoplotR <- function(host='0.0.0.0', port=NULL, daemonize=FALSE) {
  appDir <- system.file("www", package = "GeoplotRgui")
  if (appDir == "") {
    stop("Could not find www directory. Try re-installing `GeoplotRgui`.",
      call. = FALSE)
  }
  slServer(host=host, port=port, appDir=appDir, daemonize=daemonize,
    interface=list(
      TiZrY = GeoplotR::TiZrY,
      TAS = GeoplotR::TAS,
      AFM = GeoplotR::AFM,
      getSchema = function() {
        list(functions=functions, params=params, types=types,
          data=examples, optiongroups=optiongroups)
      }
    )
  )
}
