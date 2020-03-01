# cvag

`cvag` could stand for _c(ode?) variable access graph_...

![screenshot.png](screenshot.png?raw=true "screenshot of prototype 4")
> above screenshot tries to visualize [this](https://github.com/oskude/jackplot/blob/149a4a9a89cd83776852cacd050b805b4b7f4952/code/jackplot.c)

the basic idea of the graph being something like:

- show global variables
- show main variables and calls
- draw access lines for all shown calls and variables
- TODO: click open/close a call: show/hide inwards and update lines :heart_eyes:

## prototype usage

the latest [prototype](proto/4/cvag.html) to render/view this _thing_ is a [_"quick"-and-lazy_](proto/4/cvag.js) html custom element that takes a **hand-crafted** [_lol-wat-now_](proto/4/cvag.json) json data and "plots" it with html+css(_text and boxes_) and svg(_lines and symbols_)...

1. clone this repo
1. `❯ firefox cvag/proto/4/cvag.html`
1. drag-n-drop `cvag/proto/4/cvag.json` in that firefox window/tab.

> warranty void if json data modified ;P

## show stoppers

- it already exists? (my favorite!)
- is a _code-to-this_ parser even possible/feasible?
  - played with `clang -Xclang -ast-dump=json foo.c` but got bored...
  - hmmm, do i need ai for this? >.<*
- is this even useful for anything?
- will this even work?

> but i just LOVE to visualize things!
