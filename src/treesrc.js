
var minimatch = require('minimatch');
var File = require('vinyl');
var fs = require('fs');

function treeSrc(stream, tree, patterns) {

    var matcher = new minimatch.Minimatch(patterns);

    var walker = tree.walk();

    walker.on('entry', function (entry) {

        var entryPath = entry.path();

        if (! matcher.match(entryPath)) {
            return;
        }

        if (! entry.isFile()) {
            // We never actually end up in here right now
            // because tree.walk only visits files.
            stream.push(new File({
                path: entryPath,
                stat: new fs.Stats({
                    mode: entry.filemode
                })
            }));
            return;
        }

        entry.getBlob(function (err, blob) {
            if (err) {
                stream.emit('error', err);
                return;
            }

            var contents = blob.content();

            var file = new File({
                path: entryPath,
                contents: contents,
                stat: new fs.Stats({
                    mode: entry.filemode,
                    size: contents.length
                })
            });

            stream.push(file);
        });

    });

    walker.start();

}

treeSrc.fromCommit = function treeSrcFromCommit(stream, commit, patterns) {
    commit.getTree(function (err, tree) {
        if (err) {
            stream.emit('error', err);
        }
        else {
            treeSrc(stream, tree, patterns);
        }
    });
};

module.exports = treeSrc;
