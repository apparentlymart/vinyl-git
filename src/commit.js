
var through = require('through2');

var treeSrc = require('./treesrc.js');

function Commit(repo, commitId) {

    this.src = function src(patterns) {
        var stream = through.obj();

        repo.rawRepoPromise.then(function (rawRepo) {

            rawRepo.getCommit(
                commitId,
                function (err, commit) {
                    if (err) {
                        stream.emit('error', err);
                        return;
                    }

                    treeSrc.fromCommit(stream, commit, patterns);
                }
            );

        }).catch(function (err) {
            stream.emit('error', err);
        });

        return stream;
    };

}

module.exports = Commit;
