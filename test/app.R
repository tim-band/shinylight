test1 <- function(c1, c2, type, units, factor, offset, pch, bg, lwd) {
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

functions <- list(
  test1=list(
    params=list(
      c1="lengths",
      c2="weights",
      type="plot_param",
      units="test1_units"
    ),
    optiongroups=c("adjust", "plot_points")
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
  )
)

params <- list(
  a=list(type="f", data="zero"),
  plot_param=list(type="plot_type", data="points"),
  test1_units=list(type="subheader", data="test1_units"),
  lengths=list(type="length_column", data="test1_length_inits"),
  weights=list(type="weight_column", data="test1_weight_inits")
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
    bg=list(type="color", initial='#FFF'),
    lwd=list(type="f", initial=1.0)
  ),
  framework=list(
    autorefresh=list(type="b", initial=FALSE)
  )
)

types <- list(
  plot_type=list(
    kind="enum",
    values=c("p", "l", "h")
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
  )
)

examples <- list(
  points="p",
  test1_units=list("mm", "kg"),
  test1_length_inits=list(15.0,24.1,13.2,8.3),
  test1_weight_inits=list(4.4, 4.2, 6.1, 1.0)
)

symbolList <- c('<-', 'c', 'plot', 'data.frame', '+', '-', '*', '/', 'x', 'y', 'data', '$', 'one', 'two')

testServer <- function(port=NULL) {
  shinylight::slServer(host='0.0.0.0', port=port, daemonize=TRUE,
    interface=list(
      test1=test1,
      test2=test2,
      test3=test3,
      getSchema=function() {
        list(functions=functions, params=params, types=types,
          data=examples, optiongroups=optiongroups)
      },
      runR=shinylight::runR(symbolList)
    )
  )
}
