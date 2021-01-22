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
            list(error=simpleError(error), result=NULL)
          }
        ),
        error=function(err) {
          print(err);
          list(error=err, result=NULL)
        }
      )
      envelope$result <- r$result
      envelope$error <- r$error
    }
    ws$send(jsonlite::toJSON(envelope))
  })
}}

rrpcServer <- function(interface, host='0.0.0.0', port=NULL, appDir=NULL, root="/") {
  app <- list(onWSOpen=rrpc(interface))
  paths <- list("/lang"=httpuv::excludeStaticPath())
  paths[[root]] <- appDir
  app$staticPaths <- paths
  langs <- list.dirs(path=file.path(appDir, "locales"), full.names=FALSE, recursive=FALSE)
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
      headers=list("Location"=paste0(req$rook.url_scheme, "://", host, path)),
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

dataEnvironment <- new.env(parent=emptyenv())

fetchTestData <- function() {
  if (!exists("test", dataEnvironment)) {
    data(test, package='GeoplotR', envir=dataEnvironment);
  }
}

getColumn = function(column) {
  fetchTestData()
  get("test", dataEnvironment)[,column]
}

functions <- list(
  TiZrY=list(
    params=list(
      Ti="Ti",
      Zr="Zr",
      Y="Y",
      units="tizry_units",
      type="tizry_type",
      plot="tizry_plot"
    ),
    optiongroups=c("plot")
  ),
  TAS=list(
    params=list(
      Na2O="Na2O",
      K2O="K2O",
      SiO2="SiO2"
    ),
    optiongroups=c("plot")
  )
)

params <- list(
  Na2O=list(type="weightCol", data="Na2O"),
  K2O=list(type="weightCol", data="K2O"),
  SiO2=list(type="weightCol", data="SiO2"),
  Ti=list(type="proportionCol_TiO2", data="Ti"),
  Zr=list(type="proportionCol_ZrO2", data="Zr"),
  Y=list(type="proportionCol_Y2O3", data="Y"),
  tizry_units=list(type="subheader", data="tizry_units"),
  tizry_type=list(type="tizry_type", data="tizry_type"),
  tizry_plot=list(type="tizry_plot", data="tizry_plot")
)

optiongroups <- list(
  plot=list(
#    col=list(type="color", initial='#000'),
#    cex=list(type="f"),
    pch=list(type="u8"),
    bg=list(type="color", initial='#666'),
    lwd=list(type="u8")
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
    subtype="float",
    unittype="proportion_TiO2"
  ),
  proportionCol_ZrO2=list(
    kind="column",
    subtype="float",
    unittype="proportion_ZrO2"
  ),
  proportionCol_Y2O3=list(
    kind="column",
    subtype="float",
    unittype="proportion_Y2O3"
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
  )
)

examples <- list(
  Na2O=getColumn("NA2O(WT%)"),
  K2O=getColumn("K2O(WT%)"),
  SiO2=getColumn("SIO2(WT%)"),
  Ti=getColumn("TIO2(WT%)"),
  Zr=getColumn("ZR(PPM)"),
  Y=getColumn("Y(PPM)"),
  tizry_units=c("wt%", "ppm", "ppm"),
  tizry_type="LDA",
  tizry_plot="ternary"
)

#' Starts the \code{GeoplotR} GUI
#'
#' Opens a web-browser with a Graphical User Interface (GUI) for the
#' \code{IsoplotR} package.
#' @param host IP address of the virtual server, default is 0.0.0.0
#' @param port Internet port of the virtual server. If not defined, a
#' random free port will be chosen and the browser will be opened
#' to show the GUI.
#' @return server object
#' @examples
#' #GeoplotR()
#' @export
GeoplotR <- function(host='0.0.0.0', port=NULL) {
  appDir <- system.file("www", package = "GeoplotRgui")
  if (appDir == "") {
    stop("Could not find www directory. Try re-installing `GeoplotRgui`.",
      call. = FALSE)
  }
  s <- rrpcServer(host=host, port=port, appDir=appDir, root="/",
    interface=list(
      TiZrY = GeoplotR::TiZrY,
      TAS = GeoplotR::TAS,
      getSchema = function() {
        list(functions=functions, params=params, types=types,
          data=examples, optiongroups=optiongroups)
      }
    )
  )
  extraMessage <- ""
  if (is.null(port)) {
    browseTo(s)
    extraMessage <- "Call GeoplotRgui::stopGeoplotR() to stop serving GeoplotR\n"
  }
  cat(sprintf("Listening on %s:%d\n%s", host, port, extraMessage))
  invisible(s)
}

#' Stops a \code{GeoplotR} GUI
#'
#' @param server The server (returned by \code{\link{GeoplotRgui::GeoplotR()}})
#' to stop. If not supplied all servers will be stopped.
#' @examples
#' # s <- GeoplotR()
#' # stopGeoplotR(s)
#' @export
stopGeoplotR <- function(server=NULL) {
  if (is.null(server)) {
    httpuv::stopAllServers()
  } else {
    server$stop()
  }
}

#' Starts the \code{GeoplotR} GUI without exiting
#'
#' Opens a web-browser with a Graphical User Interface (GUI) for the
#' \code{GeoplotR} package. This function is intended to be used from
#' Rscript so that Rscript does not terminate and the server stays up.
#' @param host IP address of the virtual server
#' @param port Internet port of the virtual server. If not defined, a
#' random free port will be chosen and the browser will be opened
#' to show the GUI.
#' @return This function does not return.
#' @examples
#' #daemon(3838)
#' @export
daemon <- function(port=NULL, host='127.0.0.1') {
  GeoplotR(host=host, port=port)
  while (TRUE) {
    later::run_now(9999)
  }
}
