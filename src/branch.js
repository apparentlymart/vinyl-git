
var through = require('through2');

var treeSrc = require('./treesrc.js');

function Branch(repo, branchName) {

    this.src = function src(patterns) {
        var stream = through.obj();

        repo.rawRepoPromise.then(function (rawRepo) {

            rawRepo.getBranch(
                branchName,
                function (err, branch) {
                    if (err) {
                        stream.emit('error', err);
                        return;
                    }

                    treeSrc.fromCommit(stream, branch, patterns);
                }
            );

        }).catch(function (err) {
            stream.emit('error', err);
        });

        return stream;
    };

}

module.exports = Branch;
