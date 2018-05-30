// util version 1.0.0
// date: 2018/04/25 09:50
// email: wenfp@palmtrends.com
var fs = require('fs');

function timestampToUnix( timestamp ){
	return Math.round(new Date(timestamp).getTime() / 1000)
}

function unixToTimestamp( timestamp ){
	return Math.round(new Date(timestamp).getTime() * 1000)
}

function isArray( arr ){
	return Object.prototype.toString.call(arr) == '[object Array]'
}

function isObject( object ){
	return Object.prototype.toString.call( object ) == '[object Object]'
}

function trim( str ){
	return str.replace(/\s+$/).replace(/\/2/g, '').replace(/ /g,"+").replace(/[^=](=.*$)$/g, '==');
}

function appendFile(filename, data){
	fs.writeFile(process.cwd()+'/'+filename, data, { flag: 'a+'}, function(err){
		if(err) {
			console.error(err);
		} else {
			console.log('writed');
		}
	})
}

function removeLog(){
	var hours = new Date().getHours();
	if(hours == 0){
		fs.unlinkSync('pre_out_log.txt');
		fs.unlinkSync('car_confirmed_out.txt')
	}
}

module.exports = {
	timestampToUnix,
	unixToTimestamp,
	isArray,
	isObject,
	trim,
	appendFile,
	removeLog
}
