# anja-study

A study workspace holding one teaching course per exam subject, all sharing one look and one
quiz engine. Each subject's own `GLOSSARY.md` names that subject's content; this file names the
workspace itself.

## Structure

**Subject**:
One exam course, living in one top-level directory (e.g. `histology/`) with its own mission,
resources, lessons and quizzes.
_Avoid_: course, workspace, lesson (for the directory)

**Active subject**:
The one subject a session works on, fixed for the whole session: taken from the directory the
session started in, or named by the user with `predmet <name>`. Another subject means a new
session.

**Chapter**:
A numbered section of a subject's source material; the unit a focused quiz or a web search is
scoped to.
_Avoid_: topic, unit, module

**Lesson**:
One self-contained page teaching one tightly-scoped piece of a chapter, ending in practice.
_Avoid_: subject, session

**Cheat sheet**:
A printable one-page summary of a chapter (or the glossary) in `reference/`, for quick review.
_Avoid_: reference sheet, reference

## Practice

**MCQ**:
A question answered by picking one of several equal-length options.
_Avoid_: multiple choice item

**Written question**:
A question answered in the learner's own words, self-checked against a model answer.
_Avoid_: recall, open question

**Image question**:
A question built on an image from a resource ("identify what is shown"). Its own question type,
separate from MCQ. Comes in two forms: an image MCQ (pick an option, the default) or an image
written question (answer in words).
_Avoid_: picture question

**Quiz**:
A practice page of questions. Its kind is named by what it holds: MCQ quiz, write quiz, image
quiz, or mixed quiz.
_Avoid_: test, exercise

**MCQ quiz**:
A quiz of MCQs only.

**Write quiz**:
A quiz of written questions only.
_Avoid_: text quiz, written quiz

**Image quiz**:
A quiz of image questions only.
_Avoid_: picture quiz

**Mixed quiz**:
A quiz combining question types in the subject's question mix. The only kind where images and
text meet.

**Mock exam**:
A mixed quiz drawn at random from every chapter, sized like the real exam.

**Question mix**:
A subject's percentages of MCQs, written questions and image questions, set by the user when
the subject is created; it governs lesson quizzes, focused mixed quizzes and the mock exam.
_Avoid_: style, ratio

## The learner's own marks

**iPad note**:
A mark the learner made on a resource on the iPad (GoodNotes), extracted and stored per subject.
Two kinds: highlight and ink. Tagged `ipad-note:<KIND>-<COLOUR>`; a search may name the kind, the
colour, or both (`ipad-note:INK`, `ipad-note:BLUE`, `ipad-note:INK-BLUE`).
_Avoid_: note (alone), annotation, comment

**Highlight**:
An iPad note marking existing content of the resource (text, or an area such as part of an image)
in a colour.
_Avoid_: marker

**Ink**:
An iPad note the learner wrote by hand, in a colour; stored as its image with a transcription.
_Avoid_: text note, TEXT, handwriting note

**Colour**:
The named colour of an iPad note (YELLOW, GREEN, BLUE, PINK, RED, PURPLE, ORANGE, BLACK). Its
meaning is the learner's own and is never recorded; colours are only filtered on.

**Edited resource**:
A copy of a resource carrying the learner's iPad notes, named `<resource>_edited.<ext>`; the same
resource, not a new one.

## Exam material

**Exam sample**:
A resource showing real exam questions. Its questions join the question banks as their own set;
it shows the exam's style but never sets the question mix.

## Knowledge sources

**Resource**:
A file the user provided for a subject, kept in that subject's `source/`; the only default
source of facts.
_Avoid_: material, reference

**poglej-internet**:
The user's keyword permitting a web search, scoped to one chapter at most; findings are
recorded as web-sourced, never merged silently into resources.

**poglej-agenta**:
The user's keyword permitting the agent's own general knowledge as a source, scoped like
poglej-internet and labelled as such.
