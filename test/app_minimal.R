testServer <- function(port=NULL) {
  appDir <- R.utils::getAbsolutePath("test/www_minimal")
  shinylight::slRunRServer(host='0.0.0.0', port=port, appDir=appDir, daemonize=TRUE,
    permittedSymbols=c(
      '<-', 'c', 'plot', 'data.frame', '+', '-', '*', '/', 'x', 'y', 'data', '$', 'one', 'two', 'list'
    )
  )
}
