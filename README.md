# eLearning

POCs and tools about self producing eLearning contents.

## Key files

* scorm.sh: Archive (.zip) a set of resources into a SCORM 1.2 package (SCO).
  - scorm.all.sh: Create all DEMO SCOs by just running `./scorm.all.sh;`.
* scorm.reveal.js: Connect a reveal.js presentation to an LMS through SCORM API.
* gift.js: Parse a GIFT file, display its test using reveal.js, submit to LMS using SCORM API.
* scorm.utils.js: Function collection to help with SCORM formats and common tasks.
* classmarker2gift.php: Convert [ClassMarker](https://www.classmarker.com) [CSV export](https://www.classmarker.com/online-testing/manual/#exportquestions) to GIFT file.

## Utils

* List what's in a Zip archive: `unzip -l <archive.zip>;`.

## Credits

* Slides: _[reveal.js](https://revealjs.com/)_ [by @hakimel under MIT License](https://github.com/hakimel/reveal.js/blob/master/LICENSE)
* SCORM:
  - _SCORM API Wrapper_ [by Philip Hutchison under MIT-style License](https://github.com/pipwerks/scorm-api-wrapper)
  - [Example SCORM courses](https://scorm.com/scorm-explained/technical-scorm/golf-examples/) at [scorm.com](https://scorm.com) by [Rustici Software](https://rusticisoftware.com) under [Creative Commons Attribution 3.0 License](https://creativecommons.org/licenses/by/3.0/)
* cmi5:
  - [xAPI.js - cmi5 Profile Library](https://www.xapijs.dev/) [under MIT License](https://github.com/xapijs/cmi5/blob/master/LICENSE.md)
* [GIFT format](https://docs.moodle.org/en/GIFT_format) by [Moodle](https://moodle.org/) [under GNU General Public License](https://docs.moodle.org/dev/License)


# GIFT+SCORM

## Presentation

The test is added to a reveal.js presentation.
Each test's question will become a slide.
The test, those slides, will be added just before the slide containing the submit button.

## GIFT Parser

New lines in question or response will be kept and converted to HTML new lines `<br>`. A new line can also be inserted using `\n` or  `<br>`.

The GIFT parser use question title (`::title::`) as question ID.
If no title is provided, it uses question's index (its zero-based index in the question pool) prefixed with 'Q' (ex: 'Q123').
If an ID is duplicated, duplicate will be suffixed with underscores until it become unique (ex: 'Q123_', 'Q123__'). 

The GIFT file can contain code highlights using Markdown-like syntax or using HTML like `<pre><code class="language"></code></html>`.

Comments start with `//`. Contrary to [specification](https://docs.moodle.org/en/GIFT_format#Line_Comments]), comment can end a content line. `//` will be ignored when in `http://` or `https://`. [TODO: Could be simpler to stick to the spec]
