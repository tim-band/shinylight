test1 <- function(x, y, pch) {
  plot(x, y, type="p", pch=pch, bg='#ffff00')
  df <- data.frame(
    sum = x+y,
    diff = y-x
  )
  df
}

test2 <- function(x, y, c1, factor, offset, pch) {
  stop("This does not work")
}

test3 <- function(x, y, pch) {
  shinylight::sendProgress(0, 100);
  Sys.sleep(0.3);
  shinylight::sendInfoText("first information");
  Sys.sleep(0.3);
  shinylight::sendProgress(50, 100);
  Sys.sleep(0.3);
  shinylight::sendInfoText("second thing");
  Sys.sleep(0.3);
  shinylight::sendProgress(100, 100);
  data.frame(
    sum = x+y,
    diff = y-x
  )
}

testServer <- function(port=NULL) {
  appDir <- R.utils::getAbsolutePath("test/www_freeform")
  shinylight::slServer(host='127.0.0.1', port=port, appDir=appDir, daemonize=TRUE,
    interface=list(
      test1=test1,
      test2=test2,
      test3=test3
    )
  )
}
