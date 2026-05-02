  let Todo=[];

  let req=prompt("Enter your Request : ");
  
  while(true)
    {
    if(req=="quit")
    {
        console.log("Quitting the Application");
        break;
    }
     if(req=="list"){
        console.log("----------------------------------");
        for(let i=0; i<Todo.length; i++){
            console.log(i,Todo[i]);
        }
        console.log("----------------------------------");
    }

    else if(req=="add")
    {
        let item=prompt("Enter the Item To Add :");
        Todo.push(item);
        console.log("The Item Added !");
        
    }
    

    else if(req=="delete"){
        let id=prompt("Enter the index of item to delete");
        Todo.splice(id,1);
        console.log("The Task Deleted")
    }
    else("You enter the wrong request");

    req=prompt("Enter your Request : ");
  }
  
  