
var through = require('through2');
var Promise = require('bluebird');
var nodeGit = require('nodegit');

var treeSrc = require('./treesrc.js');
var commitParent = require('./commitparent.js');
var Commit = require('./commit.js');

function Branch(repo, branchNamePromise) {

    var prereqs = Promise.all([
        repo.rawRepoPromise,
        branchNamePromise
    ]);

    var branchPromise = prereqs.then(
        function (results) {
            var rawRepo = results[0];
            var branchName = results[1];
            return new Promise(function (resolve, reject) {
                rawRepo.getBranch(
                    branchName,
                    function (err, commit) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(commit);
                        }
                    }
                );
            });
        }
    );

    this.src = function src(patterns) {
        var stream = through.obj();

        branchPromise.then(function (branch) {
            treeSrc.fromCommit(stream, branch, patterns);
        }).catch(function (err) {
            stream.emit('error', err);
        });

        return stream;
    };

    this.commit = function commit(opts) {
        var treeBuilderPromise;

        var authorSig = createSignature(opts.author);
        var committerSig = (
            opts.committer ? createSignature(opts.committer) : authorSig
        );
        var message = opts.message;
        // TODO: support keepParentFiles, meaning we'd start with an
        // empty treebuilder.

        // This is populated below once the branch promise is resolved,
        // which should always happen before we get to writing the commit.
        var parentId;

        var stream = through.obj(
            {},
            function (file, enc, cb) {
                if (file.isStream()) {
                    stream.emit('error', new Error(
                        'vinyl-git: stream files are not supported'
                    ));
                    return;
                }

                if (! file.isBuffer()) {
                    // Ignore nulls.
                    // We'll make directories implicitly with the treeBuilder.
                    return;
                }

                treeBuilderPromise.then(function (treeBuilder) {
                    // TODO: Check if the file has a stat with a mode
                    // and set the executable flag if the mode is
                    // executable.
                    treeBuilder.insertBlob(file.relative, file.contents);
                    cb(undefined, file);
                }).catch(function (err) {
                    stream.emit('error', err);
                });
            },
            function (cb) {
                treeBuilderPromise.then(function (treeBuilder) {
                    treeBuilder.write(function (err, treeOid) {
                        prereqs.then(
                            function (results) {
                                var rawRepo = results[0];
                                var branchName = results[1];
                                var targetRef = 'refs/heads/' + branchName;

                                console.log(
                                    'createCommit',[
                                    targetRef,
                                    authorSig,
                                    committerSig,
                                    message,
                                    treeOid,
                                    [parentId]
                                    ]
                                );
                                rawRepo.createCommit(
                                    targetRef,
                                    authorSig,
                                    committerSig,
                                    message,
                                    treeOid,
                                    [], // TODO: parentId causes crash?
                                    function (err, commitOid) {
                                        if (err) {
                                            stream.emit('error', err);
                                        }
                                        else {
                                            cb();
                                        }
                                    }
                                );
                            }
                        ).catch(function (err) {
                            stream.emit('error', err);
                        });
                    });
                }).catch(function (err) {
                    stream.emit('error', err);
                });
            }
        );

        treeBuilderPromise = branchPromise.then(function (branch) {
            return new Promise(function (resolve, reject) {
                branch.getTree(function (err, tree) {
                    if (err) {
                        reject(err);
                    }

                    parentId = branch.oid();
                    resolve(tree.builder());
                })
            });
        }).catch(function (err) {
            // TODO: If branch doesn't exist, arrange to create an
            // initial commit and then create the branch.
            stream.emit('error', err);
        });

        return stream;
    };

    this.parent = function parent(idx) {
        return commitParent(repo, branchPromise, Commit, idx);
    };
}

function createSignature(input) {
    var time = input.time || new Date();

    return nodeGit.Signature.create(
        input.name,
        input.email,
        Math.round(time.getTime() / 1000),
        0
    );
}

module.exports = Branch;
