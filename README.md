# ShinyLight

A lightweight server for R calculations.

This project was funded by the Natural Environment Research Council (grant number 09 NE/T001518/1 ("Beyond Isoplot")).

## Building ShinyLight

To rebuild documentation and reinstall the local version of ShinyLight:

```sh
./build.sh
```

## Run tests

```sh
npm test
```

or

```sh
npm test -- --fgrep 'test that I want' --browser=chrome
```

## Run CRAN checks

```sh
./build.sh
R CMD build .
_R_CHECK_FORCE_SUGGESTS_=true _R_CHECK_CRAN_INCOMING_USE_ASPELL_=true R CMD check --as-cran shinylight_<VERSION>.tar.gz
```

## Troubleshooting

### ERROR: dependency 'xxx' is not available for package `shinylight`

Sadly, `build.sh` does not install dependencies based on what's in the
`DESCRIPTION` file. Until this is fixed, make sure that the hard-coded
list of dependencies in the `build.sh` file itself is up-to-date.

### InvalidArgumentError: binary is not a Firefox executable

On Linux, having firefox installed as both a snap and via apt causes this. Try `sudo apt remove firefox`.

### In Selenium tests, "before each" hook: WebDriverError: Reached error page

Try running the test server on its own with `Rscript test/run.R` and see what errors you get.
