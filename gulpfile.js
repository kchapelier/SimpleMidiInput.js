"use strict";

var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish'),
    mocha = require('gulp-mocha');

var files = ['./src/*.js', './gulpfile.js'];

gulp.task('lint', function () {
    return gulp
        .src(files)
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter(stylish));
});

gulp.task('test', function () {
    return gulp
        .src(['./test/*.js'])
        .pipe(mocha({
            reporter: 'spec'
        }));
});
