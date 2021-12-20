# eLearning

POCs and tools about self producing eLearning contents through standards.

## Key files

* scorm.sh: Archive (.zip) a set of resources into a SCORM 1.2 package (SCO).
  - scorm.all.sh: Create all DEMO SCOs by just running `./scorm.all.sh;`.
* cmi5.sh: Zip a set of resources into a cmi5 package (AU).
  - cmi5.all.sh: Create all DEMO AUs by just running `./cmi5.all.sh;`.
* scorm.reveal.js: Connect a reveal.js presentation to an LMS through SCORM API.
* cmi5.reveal.js: Connect a reveal.js presentation to an LMS through cmi5 and xAPI.
* gift.js: Parse a GIFT file, display its test using reveal.js, submit to LMS using SCORM API or cmi5 xAPI.
  - jqueryui.*.*: JS and base CSS to display and animate some question type(s).
  - array.shuffle.js: Add to JS `Array` a `shuffle()` function to return a randomized copy.
  - gift.clean.txt: a clean and proper GIFT example.
  - gift.dirty.txt: a parsable GIFT file with comments, special characters and errors on purpose.
* *.utils.js: Function collections to help with common tasks per subject.
* classmarker2gift.php: Convert [ClassMarker](https://www.classmarker.com) [CSV export](https://www.classmarker.com/online-testing/manual/#exportquestions) to GIFT file.
* tests/: Quality test scripts.
  - tests/external_links.php: test external hyperlinks

## Utils

* List what's in a Zip archive: `unzip -l <archive.zip>;`.

## Credits

* UI:
  - Slides: _[reveal.js](https://revealjs.com/)_ [by @hakimel under MIT License](https://github.com/hakimel/reveal.js/blob/master/LICENSE)
  - Other: [jQuery](https://jquery.com/) and [jQuery UI](https://jqueryui.com/) [under MIT License](https://jquery.org/license/)
* SCORM:
  - _SCORM API Wrapper_ [by Philip Hutchison under MIT-style License](https://github.com/pipwerks/scorm-api-wrapper)
  - [Example SCORM courses](https://scorm.com/scorm-explained/technical-scorm/golf-examples/) at [scorm.com](https://scorm.com) by [Rustici Software](https://rusticisoftware.com) under [Creative Commons Attribution 3.0 License](https://creativecommons.org/licenses/by/3.0/)
* cmi5:
  - [xAPI.js - cmi5 Profile Library](https://www.xapijs.dev/) [under MIT License](https://github.com/xapijs/cmi5/blob/master/LICENSE.md)
  - [RusticiSoftware / cmi5.js](https://github.com/RusticiSoftware/cmi5.js) by [Rustici Software](https://rusticisoftware.com) [under Apache License 2.0](https://github.com/RusticiSoftware/cmi5.js/blob/3.x/LICENSE.md)
  - [Advanced Distributed Learning's Project CATAPULT](https://github.com/adlnet/CATAPULT) Examples' [`CourseCmi5Plugin` by Rustici Software under Apache License 2.0](https://github.com/adlnet/CATAPULT/blob/main/course_examples/masteryscore_framed/js/course_cmi5.js)
* [GIFT format](https://docs.moodle.org/en/GIFT_format) by [Moodle](https://moodle.org/) [under GNU General Public License](https://docs.moodle.org/dev/License)


# GIFT

## Presentation

The test is added to a reveal.js presentation.
Each test's question will become a slide.
The test, those slides, will be added just before the slide containing the submit button.

Examples use a Markdown file for reveal.js' slides.

## GIFT Parser

New lines in question or response will be kept and converted to HTML new lines `<br>`. A new line can also be inserted using `\n` or  `<br>`.

The GIFT parser use question title (`::title::`) as question ID.
If no title is provided, it uses question's index (its zero-based index in the question pool) prefixed with 'Q' (ex: 'Q123').
If an ID is duplicated, duplicate will be suffixed with underscores until it become unique (ex: 'Q123_', 'Q123__'). 

The GIFT file can contain code highlights using Markdown-like syntax or using HTML like `<pre><code class="language"></code></html>`.

Comments start with `//`. Contrary to [specification](https://docs.moodle.org/en/GIFT_format#Line_Comments), comment can end a content line. `//` will be ignored when in `http://` or `https://`. [TODO: Could be simpler to stick to the spec]
