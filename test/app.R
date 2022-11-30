test1 <- function(c1, c2, type, units, factor, offset, pch, bg, lwd=1.0) {
  c1f <- c1 * factor
  c2o <- c2 + offset
  plot(c1f, c2o, type=type, pch=pch, bg=bg, lwd=lwd)
  df <- data.frame(
    lengths = c1f,
    weights = c2o
  )
  df
}

test2 <- function(x, y, c1, factor, offset, col) {
  stop("This does not work")
}

test3 <- function(c1, c2) {
  r <- list()
  for (i in 1:length(c1)) {
    r[[i]] <- c(c1[[i]], c2[[i]])
  }
  r
}

test4 <- function(c1, c2) {
  shinylight::sendProgress(0, 100)
  Sys.sleep(0.3)
  shinylight::sendInfoText("first information")
  Sys.sleep(0.3)
  shinylight::sendProgress(0.5, 1)
  Sys.sleep(0.3)
  shinylight::sendInfoText("second thing")
  Sys.sleep(0.3)
  shinylight::sendProgress(100, 100)
  data.frame(
    sum = c1+c2,
    diff = c2-c1
  )
}

test5 <- function(lengths, widths, depths=c(), type='2d', want_depth) {
  result <- c()
  if (type=='3d' || want_depth) {
    return(lengths * widths * depths)
  }
  return(lengths * widths)
}

groups <- list(
  a="test1",
  middles=c("test2", "test3"),
  c="test4",
  d="test5"
)

functions <- list(
  test1=list(
    params=list(
      c1="lengths",
      c2="weights",
      type="plot_param",
      units="test1_units",
      lwd="line_width"
    ),
    optiongroups=c("adjust", "plot_points"),
    paramdepends=list(
      # list of conditions ORed together
      # for when lwd should be added to the parameters
      lwd=list(
        # list of conditions ANDed together
        list(
          type="l"
        )
      )
    )
  ),
  test2=list(
    params=list(
      x="a",
      y="a",
      c1="lengths"
    ),
    optiongroups=c("adjust", "color")
  ),
  test3=list(
    params=list(
      c1="lengths",
      c2="weights"
    )
  ),
  test4=list(
    params=list(
      c1="lengths",
      c2="weights"
    )
  ),
  test5=list(
    params=list(
      lengths="lengths",
      depths="depths",
      widths="widths",
      units="test5_units",
      type="dimensions",
      want_depth="boolean"
    ),
    paramdepends=list(
      depths=list(
        list(
          type='3d'
        ),
        list(
          want_depth=TRUE
        )
      )
    )
  )
)

params <- list(
  a=list(type="f", data="zero"),
  plot_param=list(type="plot_type", data="p"),
  test1_units=list(type="subheader", data="test1_units"),
  test5_units=list(type="subheader", data="test5_units"),
  lengths=list(type="length_column", data="test1_length_inits"),
  widths=list(type="length_column", data="test1_length_inits"),
  depths=list(type="length_column", data="test1_length_inits"),
  dimensions=list(type="dimensions", data="d2"),
  boolean=list(type="b", data="false"),
  weights=list(type="weight_column", data="test1_weight_inits"),
  line_width=list(type="u8", data=1)
)

optiongroups <- list(
  adjust=list(
    factor=list(type="f", initial=1.0),
    offset=list(type="f", initial=0.0)
  ),
  color=list(
    col=list(type="color", initial='#000')
  ),
  plot_points=list(
    pch=list(type="u8", initial=1),
    bg=list(type="color", initial='#FFF')
  ),
  framework=list(
    autorefresh=list(type="b", initial=FALSE),
    dingbatsInPdf=list(type="b", initial=TRUE)
  )
)

# when options are enabled
optiondepends=list(
  # bg has one situation in which it is enabled:
  bg=list(
    # pch is between 21 and 25
    list(pch=c(21, 22, 23, 24, 25))
  ),
  # lty has one situation in which it is enabled:
  lty=list(
    # when the plot type is a line plot
    list(type=c("l", "b", "c", "o", "s"))
  )
)

types <- list(
  plot_type=list(
    kind="enum",
    values=list(p="p", lines=c("l", "o", "b"), h="h")
  ),
  length_column=list(
    kind="column",
    subtype="f",
    unittype="length_unit"
  ),
  weight_column=list(
    kind="column",
    subtype="f",
    unittype="weight_unit"
  ),
  length_unit=list(
    kind="enum",
    values=c("mm", "in"),
    factors=c(25.4, 1)
  ),
  weight_unit=list(
    kind="enum",
    values=c("kg", "lb"),
    factors=c(0.454, 1)
  ),
  dimensions=list(
    kind="enum",
    values=c("2d", "3d")
  )
)

examples <- list(
  points="p",
  false=FALSE,
  d2="2d",
  test1_units=list("mm", "kg"),
  test5_units=list("mm", "mm", "mm"),
  test1_length_inits=list(15.0,24.1,13.2,8.3),
  test1_weight_inits=list(4.4, 4.2, 6.1, 1.0)
)

symbolList <- c('<-', 'c', 'plot', 'data.frame', '+', '-', '*', '/', 'x', 'y', 'data', '$', 'one', 'two')

testServer <- function(port=NULL, initialize=NULL) {
  appDir <- R.utils::getAbsolutePath("test/www_framework")
  shinylight::slServer(host='127.0.0.1', port=port, daemonize=TRUE, appDir=appDir,
    initialize=initialize,
    interface=list(
      test1=test1,
      test2=test2,
      test3=test3,
      test4=test4,
      test5=test5,
      getSchema=function() {
        list(functiongroups=groups, functions=functions, params=params, types=types,
          data=examples, optiongroups=optiongroups, optiondepends=optiondepends)
      },
      runR=shinylight::runR(symbolList)
    )
  )
}
