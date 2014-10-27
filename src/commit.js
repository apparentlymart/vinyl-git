
var through = require('through2');
var Promise = require('bluebird');

var treeSrc = require('./treesrc.js');
var commitParent = require('./commitparent.js');

function Commit(repo, commitIdPromise) {

    var prereqs = Promise.all([
        repo.rawRepoPromise,
        commitIdPromise
    ]);

    var commitPromise = prereqs.then(
        function (results) {
            var rawRepo = results[0];
            var commitId = results[1];
            return new Promise(function (resolve, reject) {
                rawRepo.getCommit(
                    commitId,
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

        commitPromise.then(function (commit) {
            treeSrc.fromCommit(stream, commit, patterns);
        }).catch(function (err) {
            stream.emit('error', err);
        });

        return stream;
    };

    this.parent = function parent(idx) {
        return commitParent(repo, commitPromise, Commit, idx);
    };

}

module.exports = Commit;
