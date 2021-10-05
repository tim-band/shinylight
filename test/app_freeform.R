test1 <- function(x, y, pch) {
  plot(x, y, type="p", pch=pch, bg='#ffff00')
  df <- data.frame(
    sum = x+y,
    diff = y-x
  )
  df
}

test2 <- function(x, y, c1, factor, offset, col) {
  stop("This does not work")
}

symbolList <- c('<-', 'c', 'plot', 'data.frame', '+', '-', '*', '/', 'x', 'y', 'data', '$', 'one', 'two')

testServer <- function(port=NULL) {
  appDir <- R.utils::getAbsolutePath("test/www_freeform")
  shinylight::slServer(host='0.0.0.0', port=port, appDir=appDir, daemonize=TRUE,
    interface=list(
      test1=test1,
      test2=test2
    )
  )
}
