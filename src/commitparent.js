
function commitParent(repo, commitPromise, Commit, idx) {
    var parentIdPromise = commitPromise.then(function (commit) {
        var parents = commit.parents();
        if (idx < parents.length) {
            return parents[idx];
        }
        else {
            throw new Error(
                'Commit ' + commit.oid() + ' does not have parent ' + idx
            );
        }
    });
    return new Commit(repo, parentIdPromise);
}

module.exports = commitParent;
