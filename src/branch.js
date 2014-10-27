
var through = require('through2');
var Promise = require('bluebird');

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

    this.parent = function parent(idx) {
        return commitParent(repo, branchPromise, Commit, idx);
    };
}

module.exports = Branch;
