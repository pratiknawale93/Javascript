 const max=prompt("Write the range of max no");

 const no = Math.floor(Math.random()*max) + 1;
 let guses=prompt("Enter your No");
 while(true)
 {
    if(guses=="quit")
    {
        console.log("The game is Quitting");
        break;
    }
    if(guses==no)
    {
        console.log("Congratulations !");
        break;
    }
    else if(guses <no)
    {
        guses=prompt(" Hint : you no was too small try again !");
    }
    else{
        guses=prompt(" Hint :your no was too large try again !");
    }
 }
