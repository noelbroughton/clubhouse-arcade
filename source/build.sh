#!/bin/bash
cd "$(dirname "$0")"
{ cat src/head.html; echo '<script>'; cat src/0*.js; echo '</script>'; } > artifact/clubhouse-arcade.html
{ printf '<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'; cat artifact/clubhouse-arcade.html; } > dist/index.html
node -e "const s=require('fs').readFileSync('dist/index.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);console.log('syntax ok',(s.length/1024|0)+'KB')"
