Experiments in code transformation and analysis
===============================================

This repository contains a collection of transforms using recast, ast-types,
and jscodeshift.

Contents:

* transforms/embedIds.ts - TypeScript application used to embed UUIDs
  in source code for each file and each class. The input is generated
  using the classMapper utility.

  Used to tag classes and files for PostgreSQL change tracking.
  Of course, it annoyingly clutters the source files, and who wants to
  subject their code to useless transforms!

  OTOH, it can be useful in various ways.
  
