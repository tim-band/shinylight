install.packages(".", repos = NULL, type = "source")
source("test/app.R")
args <- commandArgs(trailingOnly = TRUE)
text <- if (length(args) == 1)
    paste0(readLines(args[1]), collapse = "\n") else NULL
testServer(8000, text)
