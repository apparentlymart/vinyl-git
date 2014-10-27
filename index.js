
var Promise = require('bluebird');
var nodeGit = require('nodegit');

var Branch = require('./src/branch.js');
var Commit = require('./src/commit.js');

function git(repoPath) {

    var repo = {};

    var rawRepoPromise = new Promise(function repoResolver(resolve, reject) {
        nodeGit.Repo.open(repoPath, function (err, rawRepo) {
            if (err) {
                reject(err);
            }
            else {
                resolve(rawRepo);
            }
        });
    });

    repo.branch = function branch(name) {
        return new Branch(repo, Promise.resolve(name));
    };

    repo.commit = function commit(id) {
        return new Commit(repo, Promise.resolve(id));
    };

    repo.rawRepoPromise = rawRepoPromise;

    return repo;
}

module.exports = git;
