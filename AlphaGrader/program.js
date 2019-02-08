// start processing user input
process.stdin.resume();
process.stdin.setEncoding('ascii');
// declare global variables
var input_stdin = "";
var input_stdin_array = "";
// standard input is stored into input_stdin
process.stdin.on('data', function (data) {
    input_stdin += data;
});
// standard input is done and stored into an array
// then main is called so that you can start processing your data
process.stdin.on('end', function () {
    input_stdin_array = input_stdin.split("\n");
    main();
});
// reads a line from the standard input array
// returns string
function readLine(_line_number) {
    return input_stdin_array[_line_number];
}

function parseLine(_textArray){

    var stringArray = _textArray.split(" ");
    var intArray = [];
    for(var i=0;i<stringArray.length;i++){
        intArray.push(parseInt(stringArray[i]));
    }

    return intArray;
}

function solveMeFirst(m, n) {
  // Hint: Type return a+b+c below
  if(m[0].length !== n.length) {
    console.log("Matrices are not compatible");
    return;
  }
  var s = "";
  for(var i = 0; i < m.length; i++) {
    for(var j = 0; j < n.length; j++) {
      var temp = 0;
      for(var k = 0; k < m[0].length; k++) {
        temp+=(m[i][k] * n[k][j]);
      }
      s+=temp;
      if(j < n.length - 1) {
        s+=" ";
      }
    }
    if(i < m.length - 1) {
      s+="\n";
    }
  }
  console.log(s);
}

function addMatrix(a, m, j) {
  m[j] = [];
  for(var i = 0; i < a.length; i++) {
    m[j][i] = a[i];
  }
}

function main() {
    // write your code here.
    // call `readLine()` to read a line.
    // use console.log() to write to stdout
    var a = parseLine(readLine(0));
    var b = parseLine(readLine(1));
    var c = parseLine(readLine(2));


    var d = parseLine(readLine(3));
    var e = parseLine(readLine(4));
    var f = parseLine(readLine(5));
    if (a.length != 3 || b.length != 3 || c.length != 3 || d.length != 3 || e.length != 3 || f.length != 3) {
       console.log("Matrices are not compatible");
    } else {
      var m = [];
      addMatrix(a, m, 0);
      addMatrix(b, m, 1);
      addMatrix(c, m, 2);
      var n = [];
      addMatrix(d, n, 0);
      addMatrix(e, n, 1);
      addMatrix(f, n, 2);
      solveMeFirst(m, n);
    }

    //var res = solveMeFirst(a, b);
    //console.log(res);
}
