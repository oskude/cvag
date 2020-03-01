class OskudeCvag extends HTMLElement
{
	constructor ()
	{
		super();

		this.attachShadow ({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
			main
			{
				width: max-content;
				display: grid;
			}
			main > *
			{
				grid-column : 1/2;
				grid-row    : 1/2;
			}
			cvag-file *
			{
				margin  : 0;
				padding : 0;
			}
			cvag-file
			{
				font-family : 'Jetbrains Mono', monospace;
				z-index     : 2;
			}
			cvag-file,
			cvag-vari,
			cvag-func
			{
				border         : 1pt solid var(--color-bord);
				display        : inline-block;
				vertical-align : top;
				padding-top    : 0.3em;
				padding-left   : 0.5em;
				line-height    : 1;
			}
			cvag-vari
			{
				border-right  : none;
				border-bottom : none;
				border-top    : 1pt dashed var(--color-bord);
				border-left   : 1pt dashed var(--color-bord);
			}
			cvag-vari,
			cvag-func
			{
				margin-top  : 0.5em;
				margin-left : 2em;
			}
			cvag-func
			{
				display : grid;
				border-radius : 0.8em 0 0 0;
				/* TODO: removing border is temporary? */
				border-right  : none;
				border-bottom : none;
			}
			cvag-file > cvag-name
			{
				font-style : italic;
			}
			cvag-file > cvag-name,
			cvag-vari > cvag-name
			{
				display       : block;
				padding-right : 0.5em;
			}
			cvag-func > cvag-name
			{
				grid-column   : 1/3;
				grid-row      : 1/2;
			}
			cvag-func > cvag-vars
			{
				grid-column : 2/3;
				grid-row    : 2/3;
				display     : flex;
			}
			cvag-func > cvag-cals
			{
				grid-column    : 1/2;
				grid-row       : 2/3;
				display        : flex;
				flex-direction : column;
				align-items    : flex-start;
				margin-bottom  : 0.5em;
			}
			cvag-call
			{
				line-height  : 1.5;
				display      : inline-block;
				margin-left  : 1em;
			}
			cvag-vars cvag-vari {
				display        : flex;
				flex-direction : column;
				flex-grow      : 1;
			}
			/* TODO this has to adapt to number/height of function variables */
			cvag-cals {
				margin-top : 4em;
			}
			svg > line
			{
				stroke       : var(--color-line);
				stroke-width : 1pt;
			}
			svg > .symbol
			{
				stroke : none;
				fill   : var(--color-line);
			}
			</style>
			<main></main>
		`;
		this._data  = {};
		this._dom   = this.shadowRoot.querySelector("main");
		this._SVGNS = "http://www.w3.org/2000/svg";
	}

	set data (d)
	{
		this._data = d;
		this._dom.innerHTML = "";
		this._plot_file();
		this._plot_svg();
	}

	_plot_svg ()
	{
		let svg = document.createElementNS(this._SVGNS, "svg");
		let box = this._dom.getBoundingClientRect();

		svg.setAttribute("width", box.width);
		svg.setAttribute("height", box.height);

		let funcs = this._dom.querySelectorAll("cvag-func");
		for (let func of funcs) {
			let fname  = func.querySelector("cvag-name");
			let cnames = func.querySelectorAll("cvag-call > cvag-name");
			for (let cname of cnames) {
				if (cname.offsetParent !== null) { // TODO: is not hidden
					this._plot_svg_access_lines(svg, fname, cname);
				}
			}
		}

		this._dom.appendChild(svg);
	}

	// get all lines this cname access
	// hidden children access are send to parent...
	_resolve_access (fname, cname)
	{
		let out = {
			creates  : [],
			writes   : [],
			reads    : [],
			destroys : []
		}

		// always draw
		for (let action of ["creates", "writes", "reads", "destroys"]) {
			let acc = this._data._func_defs[fname.id]._func_cals[cname.id]["_"+action];
			if (acc) {
				out[action] = out[action].concat(acc);
			}
		}

		// TODO: add real hidden call lines
		//if (cname.offsetParent === null) { // TODO: if inwards hidden...
		for (let action of ["creates", "writes", "reads", "destroys"]) {
			//let acc = this._data._func_defs[cname.id]?.["_"+action]; // TODO: canweuseyet?
			let acc = this._data._func_defs[cname.id];
			if (acc) {
				acc = acc["_"+action];
				out[action] = out[action].concat(acc);
			}
		}

		return out;
	}

	_fix_bbox_offset(parent, target)
	{
		let XOFF = parent.x;
		let YOFF = parent.y;
		return {
			x      : target.x - XOFF,
			y      : target.y - YOFF,
			top    : target.top - YOFF,
			right  : target.right - XOFF,
			bottom : target.bottom - YOFF,
			left   : target.left - XOFF,
			width  : target.width,
			height : target.height
		}
	}

	_draw_svg_symbol_read (svg, dir, x, y, s)
	{
		let sh = s / 2;
		let poly = document.createElementNS(this._SVGNS, "polygon");
		poly.setAttribute("class", "symbol");

		if (dir > 0) {
			poly.setAttribute("points", [
				[x - sh, y].join(","),
				[x + sh, y - sh].join(","),
				[x + sh, y + sh].join(","),
			].join(" "));
		} else {
			poly.setAttribute("points", [
				[x + sh, y].join(","),
				[x - sh, y - sh].join(","),
				[x - sh, y + sh].join(","),
			].join(" "));
		}

		svg.appendChild(poly);
	}

	_draw_svg_symbol_create (svg, x, y, s)
	{
		let create = document.createElementNS(this._SVGNS, "circle");
		create.setAttribute("cx", x);
		create.setAttribute("cy", y);
		create.setAttribute("r", s / 2);
		create.setAttribute("class", "symbol");
		svg.appendChild(create);
	}

	_draw_svg_connector (svg, symbol, from_box, to_box)
	{
		let OFF  = 10; // TODO: hmmm...
		let SIZE = OFF * 1.7; // TODO: this should be font size

		let dir = to_box.x - from_box.x;
		let x   = to_box.left + OFF;
		let y   = from_box.top + (from_box.height / 2);

		if (dir > 0) { // to right
			this._draw_svg_line(svg, from_box.right, y, x, y);
		} else { // to left
			this._draw_svg_line(svg, from_box.left, y, x, y);
		}

		switch (symbol) {
			case "reads"   : this._draw_svg_symbol_read   (svg, dir, x, y, SIZE); break;
			case "writes"  : this._draw_svg_symbol_read   (svg, 0 - dir, x, y, SIZE); break;
			case "creates" : this._draw_svg_symbol_create (svg, x, y, SIZE); break;
		}
	}

	_plot_svg_access_lines (svg, fname, cname)
	{
		let access     = this._resolve_access(fname, cname);
		let parent_box = this._dom.getBoundingClientRect();
		let source_box = cname.getBoundingClientRect();
		source_box     = this._fix_bbox_offset(parent_box, source_box);

		for (let action of ["creates", "writes", "reads", "destroys"]) {
			if (access[action].length > 0) {
				for (let target_name of access[action]) {
					let tname = this._dom.querySelector("#"+target_name);
					if (tname) {
						let target_box = tname.getBoundingClientRect();
						target_box = this._fix_bbox_offset(parent_box, target_box);
						this._draw_svg_connector(svg, action, source_box, target_box);
					}
				}
			}
		}
	}

	_draw_svg_line (svg, x1, y1, x2, y2, style)
	{
		let line = document.createElementNS(this._SVGNS, "line");
		line.setAttribute("x1", x1);
		line.setAttribute("y1", y1);
		line.setAttribute("x2", x2);
		line.setAttribute("y2", y2);
		svg.appendChild(line);
	}

	_plot_cvag_tag (parent, tag, name)
	{
		let e_item  = document.createElement("cvag-"+tag);
		let e_name  = document.createElement("cvag-name");
		e_name.textContent = name;
		e_name.setAttribute("id", name);
		e_item.appendChild(e_name);

		if (tag === "func") {
			let e_vars = document.createElement("cvag-vars");
			let e_cals = document.createElement("cvag-cals");
			e_item.appendChild(e_vars);
			e_item.appendChild(e_cals);
			parent.appendChild(e_item);
			return {vars:e_vars, cals:e_cals};
		}

		parent.appendChild(e_item);
		return e_item;
	}

	_plot_vars (parent, data)
	{
		for (let [name, vari] of Object.entries(data)) {
			parent = this._plot_cvag_tag(parent, "vari", name);
		}
		return parent;
	}

	_plot_cals (parent, data)
	{
		for (let [name, call] of Object.entries(data)) {
			this._plot_cvag_tag(parent, "call", name);
		}
	}

	_plot_func (parent, data, name)
	{
		let cals    = data[name]._func_cals;
		let vars    = data[name]._vari_defs;
		let parents = this._plot_cvag_tag(parent, "func", name);

		parent = this._plot_vars(parents.vars, vars);
		parent = this._plot_cals(parents.cals, cals);
	}

	_plot_file ()
	{
		let parent = this._plot_cvag_tag (this._dom, "file", this._data._name);
		parent     = this._plot_vars     (parent, this._data._vari_defs);
		parent     = this._plot_func     (parent, this._data._func_defs, "main");
	}
}

customElements.define("oskude-cvag", OskudeCvag);
