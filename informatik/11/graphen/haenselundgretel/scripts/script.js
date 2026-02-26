window.onload = function () {
	if (document.getElementById("name").innerHTML == "_Spiel_starten.html") { return; }
	if (localStorage.getItem("haun_spiel") != document.getElementById("name").innerHTML) {
		console.log("cheater");
		window.open("_Spiel_starten.html", "_self")
	}
}

function clickedLink(site) {
	localStorage.setItem("haun_spiel", site);
}