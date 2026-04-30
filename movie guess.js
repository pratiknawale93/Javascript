 
let movie="vitthal";
let guese=prompt("Enter your movie");
while((guese!==movie)&& (guese!=="quit"))
{
    alert("Wrong guese !");
    guese=prompt("Retry Again ");
    if(guese==movie)
    {
        console.log(`Success ${movie} matches`);
        break;
    }
    else if("quit"==guese){
        break;

    }
}