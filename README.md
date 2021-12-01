# eLearning

POCs and tools about self producing eLearning contents.

## Key files

* scorm.sh: Archive (.zip) a set of resources into a SCORM 1.2 package (SCO).
  - scorm.all.sh: Create all DEMO SCOs by just running `./scorm.all.sh;`.
* scorm.reveal.js: Connect a reveal.js presentation to an LMS through SCORM API.
* scorm.gift.js: Parse a GIFT file, display its test using reveal.js, submit to LMS.
* utils.scorm.js: Function collection to help with SCORM formats and common tasks.

## Utils

* List what's in a Zip archive: `unzip -l <archive.zip>;`.

## Credits

* Slides: _[reveal.js](https://revealjs.com/)_ [by @hakimel under MIT License](https://github.com/hakimel/reveal.js/blob/master/LICENSE)
* SCORM:
  - _SCORM API Wrapper_ [by Philip Hutchison under MIT-style License](https://github.com/pipwerks/scorm-api-wrapper)
  - [Example SCORM courses](https://scorm.com/scorm-explained/technical-scorm/golf-examples/) at [scorm.com](https://scorm.com) by Rustici Software under [Creative Commons Attribution 3.0 License](https://creativecommons.org/licenses/by/3.0/)
* [GIFT format](https://docs.moodle.org/en/GIFT_format) by [Moodle](https://moodle.org/) [under GNU General Public License](https://docs.moodle.org/dev/License)
