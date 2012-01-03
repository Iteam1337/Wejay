

// [] ger exakt samma resultat som new Array()
var array = ['hello', 'world'];

// forEach stöds ej i IE8 men i alla andra webbläsare inkl IE9
array.forEach(function(item){
	console.log(item)
});


// lite likt LINQ i C# kan man bearbeta sina listor och få tillbaka filtrerade resultat
var filteredArray = array.filter(function(item){
	return item == 'hello';
});

// returnerar en ny array ['HELLO', 'WORLD']. Fungerar i IE9
array.map(function(item){return item.toUpperCase()});

// every körs för varje del av en array och returnerar true om alla returnerar true
array.every(function(item){ return item == 'hello' });

// some körs för varje del av en array och returnerar true om någon av delarna returnerar true
array.some(function(item){ return item == 'hello' });

// returnerar en del av en array, i det här fallet den första
array.splice(0, 1);

// sortera i bokstavsordning
var sortedArray = array.sort(function(a,b){
	return a-b;
})

// sortera i omvänd bokstavsordning
var sortedArray = array.sort(function(a,b){
	return b-a;
})



// nu till lite användning av våra nya fina listbearbetningsfunktioner
var playHistory = [
    {
        artist:'Madonna',
        title:'Frozen'
    },
    {
        artist:'Madonna',
        title:'La Isla Bonita'
    },
    {
        artist:'Madonna',
        title:'American Pie'
    },
    {
        artist:'Madonna',
        title:'Frozen'
    },
    {
        artist:'Madonna',
        title:'Frozen'
    }
];


// behöver deklareras temporärt
var group = {};

// Exempel på arrayfunktioner för att ta fram en topplista
var topSongs = playHistory

// vi letar igenom alla artister och sparar unika låtar
.map(function(item){
    
    // enkelt = innebär tilldelning vilket gör att vi bara behöver leta en gång
    if (song = group[item.title]) 
        song.count++;
    else
        return group[item.title] = {artist: item.artist, title : item.title, count : 1};
}, topSongs)

// sortera på flest antal
.sort(function(a,b){return a.count > b.count})

// motsvarande .take(3);
.slice(0, 3);





// serialiserar ett objekt till en sträng: "['hello', 'world']"
var string = JSON.stringify(array);

// skapar ett objekt av en JSON sträng
var object = JSON.parse(string);

// så här ser en klass ut i Javascript
function Additioner = function () {
	
	// för att alltid kunna hänvisa till klassen från privata metoder sätter vi ett eget namn på instansen: 'self'
	var self = this;
	
	// privat variabel i klassen
	var total = 0;
	
	// privat metod i klassen
	var _add = function(number)
	{
		// i en privat metod blir 'this' inte längre lokalt för klassen utan för den privata metoden. 
		// Då använder vi vår egen definierade closure self istället för 'this'
		self.total = self.total + number;
	}
	
	// publik metod
	this.add = function(number, callback){
		this.total = this.total + number;
		
		// javascript lämpar sig ypperligt för att bygga asynkrona tjänster och försök därför alltid gör
		if (callback)
			callback(this.total);
	}
		
	// publik metod
	this.getResult = function()
	{
		// i publika metoder finns 'this' och därför använder vi den
		return this.total;
	}
		
}

// för att använda sin klass:

var additioner = new Additioner();

additioner.add(1);
additioner.add(5, function(result){
	console.log(result);
});

