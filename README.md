# vinyl-git

NOTE: This library doesn't actually do anything yet. Its author is just
practicing README-driven development. An actual implementation will follow
soon.

``vinyl-git`` is a vinyl adapter (like ``vinyl-fs``) that allows git commits
to be used as both sources and destinations.

Some example uses:

* Use instead of ``gulp.dest`` so you can use gulp to make a ``gh-pages``
  branch to push to GitHub Pages.
* Rewrite files in preparation for tagging a release.
* Use instead of ``gulp.src`` to work on your repo's index so you can use
  gulp to implement git pre-commit hooks.

This library works in terms of ``nodegit``, which in turn uses the C library
``libgit2``.

## Example

The following example shows how you can use ``vinyl-git`` as a writable
stream to create a commit on the ``gh-pages`` branch of some repository,
using the files in the current working directory.

```js
var path = require('path');
var git = require('vinyl-git');
var fs = require('vinyl-fs');

fs.src(path.resolve(__dirname, '**/*'))
    .pipe(
        git(path.resolve(__dirname, '.git'))
            .branch('gh-pages')
            .commit({
                author: {
                    name: 'Joe Example',
                    email: 'joe@example.com'
                },
                keepParentFiles: false
            })
    )
```

In most important ways ``commit`` behaves like ``vinylFs.dest``, writing
into the root of the commit all of the files it recieves. However, unlike
with the normal filesystem the changes won't be visible to other processes
until the file stream ends, since the commit cannot be created until its
final contents are known.

## API

The first step is always to connect to a repository:

```js
var repo = git('.git');
```

Takes a path to a git repository and returns an object representing the
given repository.

### Repository Methods

The repository object has a selection of methods that all return adapter
objects:

```js
var branch = repo.branch('master');
var commit = repo.commit('abcd1234');
var tag = repo.tag('v0.0.1');
var index = repo.index();
```

* ``branch`` returns an adapter that can be both a source (with ``src``) *and*
  a destination (with ``commit``).
* ``commit`` and ``tag`` both return adapters that can only be used as sources,
  with ``src``.
* ``index`` returns an adapter that behaves more like a standard ``vinyl-fs``,
  with ``src`` reading from the index and ``dest`` writing back to it, with
  changes visible immediately.

None of these adapters support ``watch`` at present.  ``branch`` and ``index``
may be extended to do so in future, should interesting use-cases for this
arise.

### Adapter Methods

#### Reading Files

```js
commit.src('**/*.js');
```

``src``, as you'd expect, produces a stream of ``File`` objects representing
the matching files from the given commit (or branch, or tag, or index).

#### Writing Files (Branch Adapters)

```js
branch.commit({
    author: {
        name: 'Joe Example',
        email: 'joe@example.com',
        time: new Date('2013-02-01T00:00:00Z'),
    },
    committer: {
        name: 'Steven Demonstration',
        email: 'sdemonstration@invalid'
    },
    message: 'Some new files.',
    keepParentFiles: false
});
```

``commit`` creates a writable stream that produces a new commit containing
any files it recieves. This method applies only to the ``branch`` adaptor.
It takes the following named arguments:

* ``author``: an object with ``name``, ``email`` and ``time`` parameters that
  produces the authorship information on the commit. ``time`` is optional and
  defaults to the current time.
* ``committer``: an object of the same structure as ``author``, used to
  produce the committer attribution on the commit. This property is optional
  and defaults to the same object provided for ``author``.
* ``message``: the commit message. Must be a string and must be non-empty.
* ``keepParentFiles`` chooses whether the new commit will include any files
  from the parent commit that were not 'overwritten' by files added to the
  stream. This is an optional parameter and it defaults to ``true``.

At the time ``commit`` is called it makes a note of which commit is the latest
on the given branch. The new commit it produces will then be a child of that
commit. If some other process adds a new commit to the branch before the
stream ends, the stream will produce an error instead of ending successfully.

#### Writing Files (Index Adapters)

```js
index.dest()
```

``dest`` creates a writable stream that writes any files it recieves into the
repository's index.

This adapter is mainly useful for implementing git pre-commit hooks, which
have an opportunity to read and modify the index before the commit is
created.

#### Traversing History (Commit/Branch/Tag Adapters)

```js
commit.parent(1)
```

``parent`` on any commit-like adapter returns a ``commit`` adapter representing
the given parent. The parameter is the index of which parent to return.
