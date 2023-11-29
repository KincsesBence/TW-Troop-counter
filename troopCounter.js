var army={home:{},onWay:{},inSupp:{},all:{}};
var units=[];
var groups=[];
var pageCnt=0;
var selectedGroup=0;
var selectedFilter='home';
var villages=0;
var clipBoard="";
var canceled=false;
init();

function createLink(page=1,group=0){
    return `/game.php?${game_data.player.sitter != 0 ? "t="+game_data.player.id+"&":""}village=${game_data.village.id}&type=complete&mode=units&group=${group}&page=${page}&screen=overview_villages`;
}

async function init(){
    createWindow();
}

async function createWindow(){
    loadInit();
    let startUpWin= /* html */`
    <h2 style="text-align:center;">Sereg számláló</h2>
    <p style="text-align:right;"><small>- v2.2 by <font face="" color="red"><b>toldi26</b></font></small></p>
    <div id="counter-loading" style="display: inline-flex;justify-content: center;width: 100%;">
        <img style="height:25px" src="https://dshu.innogamescdn.com/asset/6389cdba/graphic/loading.gif"><span style="padding:5px">Betöltés...</span>
    </div>
    <div id="counter-progress" class="progress-bar progress-bar-alive" style="display:none;width: 250px;">
        <span id="label1" class="label">0 / 0</span>
        <div id="percent" style="width: 45%" class="full">
        <span id="label2" class="label" style="width: 250px;">0 / 0</span>
        </div>
    </div>
    <div style="display:grid" id="counter-content">
    </div>`;
    Dialog.show("win_troop_count",startUpWin);
}

async function loadInit(group=0){
    $('#counter-loading span').text('Csoportok Betöltése...');
    villages=0;
    selectedGroup=group;
    army={home:{},onWay:{},inSupp:{},all:{}};
    units=[];
    groups=[];
    let result = await $.ajax({url: createLink(0,group)});
    fetchUnitTypes(result); 
    fetchGroups(result);
    $('#counter-loading').hide();
    $('#counter-progress').hide();

    let selector= /* html */`
        <h4 style="text-align:center;">Csoport kiválasztása:</h4>
        <select id="counter-preselect" style="width: fit-content; margin:10px auto;font-size: 16px;">
            ${groups.map((group)=>{
                return /* html */`<option ${group.value==0 ? "selected":""}  value="${group.value}">${group.text}</option>`
            })}
        </select>
        <button onclick="loadSelected()" style="width: fit-content; margin:10px auto" class="btn">Kiválaszt</button>
    `;

    $('#counter-content').html(selector);
}

window.loadSelected = () =>{
    let group = parseInt($('#counter-preselect').val());
    loadGroup(group);
    $('#counter-content').html('');
}

function setProgress(current,max){
    $('#label1').text(`${current} / ${max}`);
    $('#label2').text(`${current} / ${max}`);
    $('#percent').css('width',`${current/max*100}%`);
}

async function loadGroup(group=0){
    $('#counter-content').html('');
    $('#counter-loading').show();
    $('#counter-loading span').text('Csapatok Betöltése...');
    villages=0;
    selectedGroup=group;
    units=[];
    groups=[];
    army={home:{},onWay:{},inSupp:{},all:{}};
    let result = await $.ajax({url: createLink(0,group)});
    fetchUnitTypes(result); 
    fetchGroups(result);
    appendToArmy(result);
    $('#counter-progress').show();
    setProgress(1,pageCnt);

    var promises = [];

    for (let i = 1; i < pageCnt; i++) {
        promises.push(
            pageRequestDelayed(createLink(i,group),i)
        );
    }
    await Promise.allSettled(promises).then((results) => results.forEach((result) => appendToArmy(result.value)));
    $('#counter-loading').hide();
    $('#counter-progress').hide();
    renderTable();
    renderTroops(selectedFilter);
}

function appendToArmy(result){
    let tbodys = $(result).find('#units_table tbody').get();
    villages+=tbodys.length;
    tbodys.forEach((tbody) => {
        filterRows = $(tbody).find('tr').get();
        let HomeTds = $(filterRows[0]).find('td').get();
        let suppTds = $(filterRows[2]).find('td').get();
        let onWayTds = $(filterRows[3]).find('td').get();
        units.forEach((unit)=>{
            let valHome=parseInt($(HomeTds[unit.col]).text());
            let valSupp=parseInt($(suppTds[unit.col-1]).text());
            let valOnWay=parseInt($(onWayTds[unit.col-1]).text());
            add(army.home,unit.name,valHome);
            add(army.inSupp,unit.name,valSupp);
            add(army.onWay,unit.name,valOnWay);
            add(army.all,unit.name,valHome);
            add(army.all,unit.name,valSupp);
            add(army.all,unit.name,valOnWay);
        })
    })
}

function add(to,unit,value){
    if (!to.hasOwnProperty(unit)) {
        to[unit]=value;
    }else{
        to[unit]+=value;
    }
}

function pageRequestDelayed(url,delay){
    return new Promise( async (resolve,reject)=>{
        setTimeout(async ()=>{
            if(!canceled){
                setProgress(delay+1,pageCnt);
                let result = await $.ajax({url: url});
                resolve(result);
            }
        },200*delay);
    });
}

function fetchUnitTypes(html){
    let cols = $(html).find('#units_table thead th').get();
    cols.forEach((col,index)=>{
        let img=$(col).find('img');
        if(img.length>0){
            units.push({
                col:index,
                name:getUnitNameFromUrl(img.attr('src')),
                img:img.attr('src'),
                text:img.attr('title')
            });
        }
    });
    console.log(units);
}

function getUnitNameFromUrl(url){
    let frag=url.split('/');
    return frag[frag.length-1].split('.')[0].replace('unit_','').replace('@2x','');
}

function fetchGroups(html){
    groups=[];
    let groupsHtml = $(html).find('.group-menu-item').get();
    if(groupsHtml.length>0){
        groupsHtml.forEach(group => {
            groups.push({
                text:$(group).text().trim().slice(1,-1),
                value:$(group).attr('data-group-id')
            });
        });
    }else{
        let groupsHtml = $($(html).find('#paged_view_content').find('select').get()[0]).find('option').get();
        groupsHtml.forEach(group => {
            if(!$(group).is(':disabled')){

                let params = new URLSearchParams($(group).attr('value'));
                console.log(params,$(group).attr('value'));
                groups.push({
                    text:$(group).text(),
                    value:params.get("group")
                });
            }
        });
    }
    
    let select=$($(html).find('.paged-nav-item').get()[0]).parent().find('select');

    if(select.length==1){
        let opt = select.find('option');
        pageCnt = opt.length-1;
    }else{
        pageCnt = $(html).find('.paged-nav-item').length;
    }
}

function renderTroops(filter){
    $('#cnt_village').text(`Összesen ${villages} falu vizsgálva!`);
    selectedFilter=filter;
    let table='';
    clipBoard=`${filter}:\n`;
    let arr = Object.values(army[filter]);
    let max = Math.max(...arr).toString().length+2;
    for (let i = 0; i < units.length; i++) {
        if(i%2==0){
            table+=`<tr><th style="width:20px"><img style="width:20px" src="${units[i].img}"></th><td bgcolor="#fff5da" style="width: calc(50% - 20px)">${army[filter][units[i].name]}</td>`;
            clipBoard+=`[unit]${units[i].name}[/unit] ${army[filter][units[i].name].toString().padEnd(max,'\u2007')}`;
        }else{
            table+=`<th style="width:20px"><img style="width:20px" src="${units[i].img}"></th><td bgcolor="#fff5da" style="width: calc(50% - 20px)">${army[filter][units[i].name]}</td></tr>`;
            clipBoard+=`[unit]${units[i].name}[/unit] ${army[filter][units[i].name]}\n`;
        }
    }
    
    $('#troops').html(table);
}

function copyToClipBoard(){
    navigator.clipboard.writeText(clipBoard).then(()=>{
        window.top.UI.InfoMessage('A csapatok a vágólapra lettek másolva');
    }).catch(()=>{
        $('#textarea-copy').find('textarea').html(clipBoard);
        $('#textarea-copy').show();
    })
}

$('.popup_box_close').on('click',()=>{
    canceled=true;
});

function renderTable(){
    let win= /* html */`
    <table width="100%">
        <tbody>
            <tr>
                <th style="text-align:center;">
                Csoportok: 
                <select value="0" id="Groups" onchange="loadGroup(this.value);">
                    ${groups.map((group)=>{
                        return /* html */`<option ${group.value==selectedGroup ? "selected":""}  value="${group.value}">${group.text}</option>`
                    })}
                </select>
                </th>
            </tr>
            <tr>
                <td>
                    <table width="100%">
                        <tbody>
                            <tr>
                                <th style="text-align:center;" colspan="4">Szűrés: <select onchange="renderTroops(this.value);">
                                        <option value="home">Rendelkezésre álló</option>
                                        <option value="all">Összes csapat</option>
                                        <option value="inSupp">Támogatásban</option>
                                        <option value="onWay">Úton</option>
                                    </select>
                                </th>
                            </tr>
                        </tbody>
                        <tbody id="troops">
                        </tbody>
                    </table>
                </td>
            </tr>
            <tr>
                <th><b id="cnt_village">Betöltés...</b><a href="#" style="float: right;"
                        onclick="copyToClipBoard();">Másolás</a></th>
            </tr>
            <tr id="textarea-copy" style="display:none;">
                <td>
                <textarea onclick="this.focus();this.select()" readonly="readonly"
                style="height:100px;width:96%;resize: none;"></textarea>
                </td>
            </tr>
        </tbody>
    </table>`;
    $('#counter-content').html(win);
}
