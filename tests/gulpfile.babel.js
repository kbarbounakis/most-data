
var gulp = require('gulp');
var path = require('path');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var eslint = require('gulp-eslint');
var del = require('del');
//server build directory
var buildDir = 'dist/';
//test source directory
var sources = 'src/**/*.js';

//clean dist server modules
gulp.task('clean:test', function() {
    return del([buildDir]);
});

// build test modules
gulp.task('build:test', ['lint:test','copy:test'], function() {
  return gulp.src(sources)
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(buildDir));
});

// lint test modules
gulp.task('lint:test', function () {
  return gulp.src(sources)
    .pipe(eslint())
    .pipe(eslint.format());
});

//clean dist test modules
gulp.task('clean:test', function() {
    return del([buildDir]);
});

gulp.task('copy:test', function() {
    return gulp.src('src/config/**/*')
        .pipe(gulp.dest(path.join(buildDir, 'config')))
});

//build and watch server modules for changes
gulp.task('watch:test', ['build:test'], function() {
  return gulp.watch(sources, ['build:test']);
});