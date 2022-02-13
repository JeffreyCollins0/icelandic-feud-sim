// ==== Simulation Functions ====

sim_time = 0;
sim_ticks_enabled = true;
box_width_val = "50vw";
instance_id_base = 0;
names = [
    "Njal", "Hrut", "Gunnar", "Thorgeir", "Hogni", "Hoskuld", "Egil", "Grim", "Valgard", "Mord", "Grani", "Thorolf", "Atli",
    "Hallgerd", "Bergthora", "Astrid", "Unn", "Hildigunn", "Thorgerd", "Hildirid", "Asgerd", "Thordis", "Joreid", "Hallkatla", 
    "Ingunn", "Steinvor", "Hrapp"
];
farm_names = [
    "Hlidarendi", "Hrappstaddr", "Bergthorshvol", "Borg", "Hvanneyri", "Anabrekka", "Grimolfsstadir", "Grimarsstadir", 
    "Krumsholar", "Beigaldi", "Einkunnir", "Thursstadir", "Stangarholt", "Jardlangsstadir", "Sigmundarstadir", "Mundadarnes",
    "Varmlaek", "Alftanes", "Aurland"
];

class Person {
    constructor(value, farm) {
        this.person_id = instance_id_base;
        instance_id_base += 1;
        this.name = names[Math.floor(Math.random() * names.length)];
        this.farm = farm;
        this.value = value;
        this.life = (Math.floor(Math.random() * 9)) * 18;
        this.respect = (Math.floor(Math.random() * 12) - 1);
        this.wisdom = Math.floor(Math.random() * 11);
        this.mood = (Math.floor(Math.random() * 8) + 5);
        this.spouse = null;
        var hero_chance = Math.random();
        if(hero_chance < 0.1){
            // saga hero, gains some luck and a wisdom bonus
            this.luck = Math.floor(Math.random() * 6);
            this.wisdom += 2;
        }else{
            this.luck = 0;
        }
        this.abroad_time = 0;
        this.deceased = false;
    }
}

class Farm {
    constructor(num_owners, num_slaves) {
        this.name = farm_names[Math.floor(Math.random() * farm_names.length)];
        this.people = [];
        // make people for each slot
        for(var j=0; j<num_owners; j++){
            var person = new Person(200, this);
            this.people.push(person);
        }
        for(var j=0; j<num_slaves; j++){
            var person = new Person(12, this);
            this.people.push(person);
        }
        this.silver = ( (num_owners * 200) + (num_slaves * 12) );
    }
}

farms = [];
lawsuits = [];

function init(){
    // initializes the sim environment
    for(var i=0; i<4; i++){
        var farm = new Farm((Math.floor(Math.random() * 2) + 2), (Math.floor(Math.random() * 10) + 6));
        farms.push(farm);
    }
    printFarms();
    // initializes some UI vars
    box_width_val = document.getElementById("message_box").style.width;
}

function restart(){
    // clear all sim variables
    farms = [];
    lawsuits = [];
    sim_time = 0;
    sim_ticks_enabled = true;
    instance_id_base = 0;
    // redo init
    init();
    // restart sim loop
    game_loop = setInterval(step, 200); // 1/5-second time increments
}

function step(){
    // decides whether to do a sim tick this step
    if(sim_ticks_enabled){
        update();
    }
}

function update(){
    // called on each sim tick

    if(farms.length == 0){
        // end of sim
        clearInterval(game_loop);
        setTimeout(function(){
            postMessage("The scouring of Iceland", "Every farm in Iceland has been destroyed and its population whittled down to zero. If only they\'d followed the law more...", -1);
        }, 10);
    }else{

    if(sim_time == 36){
        // handle events at the althing
        if(lawsuits.length > 0){
            // settle lawsuits
            var n = 0;
            var net_result = 0;
            var message = "";
            while(lawsuits.length > 0){
                var suit = lawsuits.pop();
                var result = legalCase(suit[0], suit[1], suit[2], suit[3]);
                message += result[0];
                net_result += result[1];
                n += 1;
            }
            // open message box (average out the result)
            setTimeout(function(){
                postMessage("Althing", message, Math.round(net_result / n));
            }, 10);
        }else{
            // loop time
            sim_time = 0;
        }
    }else{
        // random event
        if(Math.random() < 0.2){
            var person = randomPerson(function(person){ return person.abroad_time == 0 && person.deceased == false });
            if(person != "None"){
                var event = randomEvent(person);
                if(event[0] != "None"){
                    // open message box
                    setTimeout(function(){
                        postMessage(event[0], event[1], event[2]);
                    }, 10);
                }
            }
        }

        // increment time
        sim_time += 1;
    }

    for(var i=0; i<farms.length; i++){
        var farm = farms[i];
        for(var j=0; j<farm.people.length; j++){
            var person = farm.people[j];
            if(person.deceased == false){
                person.life -= 1;
                // handle people out abroad
                if(person.abroad_time > 0){
                    person.abroad_time -= 1;
                    // chance of death while abroad (~5%)
                    if(Math.random() < 0.05){
                        handleDeath(person);
                    }
                }
                // handle people dying of old age
                if(person.life == 0){
                    handleDeath(person);
                }
            }
        }
    }

    // housekeeping
    for(var i=farms.length-1; i>=0; i--){
        farms[i].people = farms[i].people.filter(person => { return person.deceased == false });
        if(farms[i].people.length == 0){
            // no one left at the farm
            farm.people = [];
            var arrRef = farms;
            farms.splice(i, 1);
        }
    }

    }

    // update farm data
    printFarms();
}

function randomEvent(person1){
    // handle events happening at random (within the 20% chance of something happening)

    function randomCondition(condition){
        var options = [];
        farms.forEach(farm => {
            farm.people.forEach(person => {
                if(condition(person) && person.deceased == false){
                    options.push(person);
                }
            })
        });
        if(options.length == 0){
            return "None";
        }
        var index = Math.floor(Math.random() * options.length);
        return options[index];
    }

    var index = Math.floor(Math.random() * 11);
    switch (index){
        case 0:
            // mood boost (favor)
            var other = randomCondition(function(person){ return (person.farm != person1.farm) });
            if(other == "None"){
                return ["None", "None"];
            }
            person1.mood += 4;
            other.mood += 4;
            return ["Favor", (person1.name+" does a favor for "+other.name+"."), 1];
        case 1:
            // mood boost (foster)
            var child = randomCondition(function(person){ return (person.farm != person1.farm && person.life > 60) });
            if(child == "None"){
                return ["None", "None"];
            }
            person1.farm.people.push(child);
            child.farm.people.splice(child.farm.people.indexOf(child), 1);
            child.farm = person1.farm;
            person1.mood += 3;
            child.mood += 3;
            return ["Fostering", (person1.name+" takes "+child.name+" of "+child.farm.name+" as a foster-child."), 0];
        case 2:
            // mood boost (marriage, child)
            if(person1.spouse == null){
                // marry
                var fiance = randomCondition(function(person){ return (person.value >= person1.value && person.farm != person1.farm && person.spouse == null) });
                if(fiance == "None"){
                    return ["None", "None"];
                }
                person1.spouse = fiance;
                person1.mood += 4;
                fiance.spouse = person1;
                fiance.mood += 4;
                fiance.farm = person1.farm;
                return ["Marriage", (person1.name+" marries "+fiance.name+" of "+fiance.farm.name+"."), 1];
            }else{
                // child
                if(Math.random() >= 0.5){
                    var child = new Person(person1.value, person1.farm);
                    person1.farm.people.push(child);
                    person1.mood += 3;
                    person1.spouse.mood += 3;
                    return ["New arrival", (person1.name+" and "+person1.spouse.name+" have a child, "+child.name+"."), 1];
                }else{
                    var child = new Person(person1.spouse.value, person1.spouse.farm);
                    person1.spouse.farm.people.push(child);
                    person1.mood += 3;
                    person1.spouse.mood += 3;
                    return ["New arrival", (person1.name+" and "+person1.spouse.name+" have a child, "+child.name+"."), 1];
                }
            }
        case 3:
            // mood decay
            person1.mood -= 2;
            return ["None", "None"];
        case 4:
            // go abroad
            if(person1.abroad_time == 0){
                person1.abroad_time = (12 * (Math.floor(Math.random() * 3) + 2));
                return ["Viking and trading", (person1.name+" goes abroad."), 0];
            }
        case 5:
        case 6:
        case 7:
        case 8:
            // instigate (regular insult, nid insult, horse fight, theft)
            var random_result = Math.floor(Math.random() * 6);
            switch(random_result){
                case 0:
                case 1:
                    // insult
                    var target = randomCondition(function(person){ return person.farm != person1.farm });
                    if(target == "None"){
                        return ["None", "None"];
                    }
                    target.mood -= 3;
                    var message = person1.name+" greatly insults "+target.name+".";
                    if(target.mood < 5){
                        if(target.respect <= 0){
                            // start a fight
                            var targ_team = getTeam(target);
                            var chal_team = getTeam(person1);
                            var result = fight(targ_team, chal_team);
                            if(result[0] == "None"){
                                return ["None", "None"];
                            }
                            message += "\n"+result[0];
                        }else{
                            lawsuits.push([target, person1, "slander", 12]);
                        }
                    }
                    return ["Insult", message, -1];
                case 2:
                    // nid insult
                    var target = randomCondition(function(person){ return person.farm != person1.farm });
                    if(target == "None"){
                        return ["None", "None"];
                    }
                    target.mood = 2;
                    // start a fight automatically
                    var targ_team = getTeam(target);
                    var chal_team = getTeam(person1);
                    var result = fight(targ_team, chal_team);
                    if(result[0] == "None"){
                        return ["None", "None"];
                    }
                    return ["Nid insult", person1.name+" targets "+target.name+" with a Nid insult."+"\n"+result[0], result[1]];
                case 3:
                case 4:
                    // horse fight
                    var opponent = randomCondition(function(person){ return person.farm != person1.farm });
                    if(opponent == "None"){
                        return ["None", "None"];
                    }
                    if(opponent.luck > person1.luck){
                        // challenger loses
                        person1.mood -= 3;
                        person1.luck -= 1;
                        opponent.mood += 2;
                        opponent.luck -= 1;
                        var message = person1.name+" challenges "+opponent.name+" to a horse fight and loses.";
                        return ["Horse fight", message, -1];
                    }else if(opponent.luck < person1.luck){
                        // challenger wins
                        person1.mood += 2;
                        person1.luck -= 1;
                        opponent.mood -= 3;
                        opponent.luck -= 1;
                        var message = person1.name+" challenges "+opponent.name+" to a horse fight and wins.";
                        return ["Horse fight", message, 1];
                    }else if(Math.random() < 0.5){
                        // challenger wins
                        person1.mood += 2;
                        opponent.mood -= 3;
                        var message = person1.name+" challenges "+opponent.name+" to a horse fight and wins.";
                        return ["Horse fight", message, 1];
                    }else{
                        // challenger loses
                        person1.mood -= 3;
                        opponent.mood += 2;
                        var message = person1.name+" challenges "+opponent.name+" to a horse fight and loses.";
                        return ["Horse fight", message, -1];
                    }
                case 5:
                    // theft
                    var farm = farms[Math.floor(Math.random() * farms.length)];
                    var amount = Math.floor(0.2 * farm.silver);
                    if(farm != person1.farm){
                        var witness = randomCondition(function(person){ return person.farm == farm });
                        farm.silver -= amount;
                        person1.farm.silver += amount;
                        if(witness == "None"){
                            return ["None", "None"];
                        }
                        lawsuits.push([witness, person1, "theft", amount]);
                        witness.mood -= 6;
                        return ["Theft", person1.name+" steals "+amount+" silvers-worth from "+farm.name+" but is seen by "+witness.name+".", -1];
                    }
                    return ["None", "None"];
            }
            break;
        case 9:
            if(person1.mood < 3){
                var target = randomCondition(other => { return other.farm != farm });
                var targ_team = getTeam(target);
                var chal_team = getTeam(person1);
                var result = fight(targ_team, chal_team);
                return ["Assault", result[0], result[1]];
            }
            return ["None", "None"];
        default:
            // mood boost (gift-giving)
            var other = randomCondition(function(person){ return (person.farm != person1.farm) });
            if(other == "None"){
                return ["None", "None"];
            }
            person1.mood += 4;
            other.mood += 4;
            return ["Gift-giving", person1.name+" gives a gift to "+other.name+" of "+other.farm.name+".", 1];
      }
}

function randomPerson(conditions){
    var possibilities = [];
    farms.forEach(farm => {
        farm.people.forEach(person => {
            if(conditions(person)){
                possibilities.push(person);
            }
        });
    });
    if(possibilities.length > 0){
        var index = Math.floor(Math.random() * possibilities.length);
        var person = possibilities[index];
        return possibilities[index];
    }else{
        return "None";
    }
}

function fight(group1, group2){
    // get collective luck of each side
    var g1_luck = 0;
    var g2_luck = 0;
    group1.forEach(fighter => {
        g1_luck += fighter.luck;
    });
    group2.forEach(fighter => {
        g2_luck += fighter.luck;
    });

    // declare an ambush if too great a numbers difference
    var g1_charge = "slaughter"
    if(group2.length-group1.length > 1){
        g1_charge = "slaughter-ambush"
    }
    var g2_charge = "slaughter"
    if(group2.length-group1.length > 1){
        g2_charge = "slaughter-ambush"
    }

    // function to test for an opponent in a given group
    function randomInGroup(group){
        var selectgroup = group.filter(person => { return person.deceased == false });
        if(selectgroup.length == 0){
            return "None";
        }
        var index = Math.floor(Math.random() * selectgroup.length);
        return selectgroup[index];
    }

    if(g1_luck > g2_luck){
        // group 1 wins

        // allied losses
        group1.forEach(fighter => {
            fighter.luck -= 1;
            fighter.mood += 3
            if(fighter.luck < 0){
                handleDeath(fighter);
                opponent = randomInGroup(group2);
                if(opponent == "None"){
                    return ["None", "None"];
                }
                lawsuits.push([fighter, opponent, g2_charge, fighter.value]);
            }
        });
        // opposing losses
        var losses = Math.ceil(0.8 * group2.length);
        for(var i=0; i<losses; i++){
            handleDeath(group2[i]);
            opponent = randomInGroup(group1);
            if(opponent == "None"){
                return ["None", "None"];
            }
            lawsuits.push([group2[i], opponent, g1_charge, group2[i].value]);
        }
    }else if(g1_luck < g2_luck){
        // group 2 wins

        // allied losses
        group2.forEach(fighter => {
            fighter.luck -= 1;
            fighter.mood += 3;
            if(fighter.luck < 0){
                handleDeath(fighter);
                opponent = randomInGroup(group1);
                if(opponent == "None"){
                    return ["None", "None"];
                }
                lawsuits.push([fighter, opponent, g1_charge, fighter.value]);
            }
        });
        // opposing losses
        var losses = Math.ceil(0.8 * group1.length);
        for(var i=0; i<losses; i++){
            handleDeath(group1[i]);
            opponent = randomInGroup(group2);
            if(opponent == "None"){
                return ["None", "None"];
            }
            lawsuits.push([group1[i], opponent, g2_charge, group1[i].value]);
        }
    }else{
        if(Math.random() < 0.5){
            // group 1 wins
            var g1_losses = Math.ceil(0.4 * group1.length);
            for(var i=0; i<g1_losses; i++){
                handleDeath(group1[i]);
                opponent = randomInGroup(group2);
                if(opponent == "None"){
                    return ["None", "None"];
                }
                lawsuits.push([group1[i], opponent, g2_charge, group1[i].value]);
            }
            var g2_losses = Math.ceil(0.6 * group2.length);
            for(var i=0; i<g2_losses; i++){
                handleDeath(group2[i]);
                opponent = randomInGroup(group1);
                if(opponent == "None"){
                    return ["None", "None"];
                }
                lawsuits.push([group2[i], opponent, g1_charge, group2[i].value]);
            }
            group1.forEach(fighter => {
                fighter.mood += 3;
            });
        }else{
            // group 2 wins
            var g1_losses = Math.ceil(0.6 * group1.length);
            for(i=0; i<g1_losses; i++){
                handleDeath(group1[i]);
                opponent = randomInGroup(group2);
                if(opponent == "None"){
                    return ["None", "None"];
                }
                lawsuits.push([group1[i], opponent, g2_charge, group1[i].value]);
            }
            var g2_losses = Math.ceil(0.4 * group2.length);
            for(i=0; i<g2_losses; i++){
                handleDeath(group2[i]);
                opponent = randomInGroup(group1);
                if(opponent == "None"){
                    return ["None", "None"];
                }
                lawsuits.push([group2[i], opponent, g1_charge, group2[i].value]);
            }
            group2.forEach(fighter => {
                fighter.mood += 3;
            });
        }
    }

    // return message
    return ["A fight breaks out between those of "+group1[0].farm.name+" and those of "+group2[0].farm.name+".", -1];
}

function legalCase(person1, person2, charge, amount){
    var message = "A lawsuit was settled.";
    var winner = -1;
    var result = 0;
    switch(charge){
        case "theft":
            person2.farm.silver -= amount;
            person1.farm.silver += amount;
            if(person2.deceased == false){
                message = person2.name+" is sentenced to full outlawry for theft.\n";
                if(person2.respect > 0){
                    if(person2.spouse != null){
                        message += person2.spouse.name+" divorces "+person2.name+" before they leave for abroad.\n";
                    }
                    result = 0;
                }else{
                    message += person2.name+" refuses to leave and is killed.\n";
                    result = -1;
                }
                handleDeath(person2);
            }else{
                message = "Those of "+person2.farm.name+" are sentenced to pay full compensation for theft.\n";
            }
            winner = 0;
            break;
        case "slander":
            message = "";
            if(person2.deceased == false){
                if(person2.luck > person1.luck){
                    if(person2.wisdom > person1.wisdom){
                        // no consequences, improper ruling
                        message += "The case of slander is settled with no compensation due to "+person2.name+"\'s cleverness.\n";
                        winner = 1;
                        result = -1;
                    }else{
                        // half compensation
                        person2.farm.silver -= Math.round(amount/2);
                        person1.farm.silver += Math.round(amount/2);
                        message += person2.name+" is sentenced to pay half compensation for slander due to their cleverness.\n";
                        winner = 1;
                        result = -1;
                    }
                }else if(person2.luck < person1.luck){
                    // full compensation
                    person2.farm.silver -= amount;
                    person1.farm.silver += amount;
                    message += person2.name+" is sentenced to pay full compensation for slander.\n";
                    winner = 0;
                }else{
                    if(person2.wisdom > person1.wisdom){
                        // half compensation
                        person2.farm.silver -= Math.round(amount/2);
                        person1.farm.silver += Math.round(amount/2);
                        message += person2.name+" is sentenced to pay half compensation for slander due to their cleverness.\n";
                        winner = 1;
                        result = -1;
                    }else{
                        // full compensation
                        person2.farm.silver -= amount;
                        person1.farm.silver += amount;
                        message += person2.name+" is sentenced to pay full compensation for slander.\n";
                        winner = 0;
                    }
                }
                if(person2.farm.silver < 0){
                    person2.farm.silver = 0;
                }
            }else{
                person2.farm.silver -= amount;
                person1.farm.silver += amount;
                message += "Those of "+person2.farm.name+" are sentenced to pay full compensation for slander.\n";
                winner = 0;
            }
            break;
        case "slaughter":
            message = "";
            if(person2.farm.silver < amount){
                if(person2.deceased == false){
                    person2.abroad_time = 108;
                    message += person2.name+" is sentenced to partial outlawry due to being unable to pay full compensation for slaughter.\n";
                }else{
                    message += "Those of "+person2.farm.name+" are sentenced to pay what they have as compensation for slaughter.\n";
                }
                person1.farm.silver += person2.farm.silver;
                person2.farm.silver = 0;
            }else{
                person1.farm.silver += amount;
                person2.farm.silver -= amount;
            }
            message += person1.name+" is granted full compensation for slaughter.\n";
            result = 0;

            // handle death after
            handleDeath(person1);

            break;
        case "slaughter-ambush":
            message = "";
            if(person2.farm.silver < amount){
                if(person2.deceased == false){
                    person2.abroad_time = 108;
                    message += person2.name+" is sentenced to partial outlawry due to being unable to pay full compensation for slaughter.\n";
                }else{
                    message += "Those of "+person2.farm.name+" are sentenced to pay what they have as compensation for slaughter.\n";
                }
                person1.farm.silver += person2.farm.silver;
                person2.farm.silver = 0;
            }else{
                person1.farm.silver += amount;
                person2.farm.silver -= amount;
            }
            message += person1.name+" is granted full compensation for slaughter.\n";
            result = 0;

            // handle death after
            handleDeath(person1);
            
            break;
        case "slaughter-nid":
            message = "";
            if(person2.farm.silver < amount){
                if(person2.deceased == false){
                    person2.abroad_time = 108;
                    message += person2.name+" is sentenced to partial outlawry due to being unable to pay full compensation for slaughter.\n";
                }else{
                    message += "Those of "+person2.farm.name+" are sentenced to pay what they have as compensation for slaughter.\n";
                }
                person1.farm.silver += person2.farm.silver;
                person2.farm.silver = 0;
            }else{
                person1.farm.silver += amount;
                person2.farm.silver -= amount;
            }
            message += person1.name+" is granted full compensation for slaughter.\n";
            result = 0;
            
            // handle death after
            handleDeath(person1);
            
            break;
    }

    // reactions to the case
    if(person1 != undefined){
        if(winner == 0){
            person1.mood += 3;
        }else{
            if(person1.respect <= 0){
                person1.mood = 2;
            }else{
                person1.mood -= 1;
            }
        }
    }
    if(person2 != undefined){
        if(winner == 1){
            person2.mood += 3;
        }else{
            if(person2.respect <= 0){
                person2.mood = 2;
            }else{
                person2.mood -= 1;
            }
        }
    }

    // return
    return [message, result];
}

function getTeam(person){
    var team = [person];
    var extras = 0;
    if(person.mood <= 1){
        extras = Math.min(person.farm.people.length-1, 24);
    }else if(person.mood < 3){
        extras = Math.min(person.farm.people.length-1, 6);
    }
    for(var i=0; i<extras; i++){
        team.push(person.farm.people[i]);
    }
    return team;
}

function handleDeath(person){
    if(person.spouse != null){
        person.spouse.spouse = null;
    }
    person.deceased = true;
}

// ==== Start the sim loop ====

init();
game_loop = setInterval(step, 200); // 1/5-second time increments
setTimeout(function(){
    postMessage("Welcome", "This simulator is meant to approximate the events of an Icelandic community interacting with one another. Simulation by Jeffrey Collins.", 0);
}, 10);

// ==== UI Functions ====

var text_box_open = true;
// separate by positive/negative/neutral
var response_options_pos = ["Cool", "Good to hear", "Nice", "Great", "All in good friendship"];
var response_options_neu = ["Ok", "Acceptable", "Alright", "Sure", "Of course"];
var response_options_neg = ["This is fine", "Why are you like this", "Not again", "How dare they", "Not very drengiligr of you"];

function openBox(status){
    var item = document.getElementById("message_box");
    item.style.display = "block";
    // disable sim ticks for an althing / message box
    sim_ticks_enabled = false;
    // update button message
    textAdvanceResponse(status);
    setTimeout(function(){
        var item = document.getElementById("message_box");
        item.style.width = box_width_val;
        item.style.height = "30vh";
        text_box_open = true;
    }, 10);
}

function closeBox(){
    var item = document.getElementById("message_box");
    item.style.width = 0;
    item.style.height = 0;
    // re-enable sim ticks after an althing / message box
    setTimeout(function(){
        var item = document.getElementById("message_box");
        item.style.display = "none";
        text_box_open = false;
        sim_ticks_enabled = true;
    }, 250); // 1/2 sec delay
}

function toggleBox(){
    if(text_box_open){
        closeBox();
    }else{
        openBox();
    }
}

function postMessage(title, content, result){
    var box = document.getElementById("message_content");
    box.innerHTML = content;
    var box_title = document.getElementById("message_title");
    box_title.innerHTML = title;
    openBox(result);
}

function printFarms(){
    // print all as blocks to the thing
    var container = document.getElementById("farm_list");
    container.innerHTML = "";
    farms.forEach(farm => {
        container.innerHTML += `
        <div class="farm_card list_responsive fill_width_ignore">
            <p>`+farm.name+`</p>
            <div class="row_responsive fill_width_ignore">
                <span class="farm_span">Members: `+farm.people.length+`</span>
                <span class="farm_span">Silver: `+farm.silver+`</span>
            </div>
        </div>
        `;
    });
}

function textAdvanceResponse(status){
    // add a funny message to the text-advance button
    var array = response_options_neu;
    if(status == 1){
        array = response_options_pos;
    }else if(status == -1){
        array = response_options_neg;
    }
    var response_id = Math.floor(Math.random() * array.length);
    var item = document.getElementById("text_advance");
    item.innerHTML = array[response_id];
}