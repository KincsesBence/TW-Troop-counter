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
    renderWindow();
    loadGroup(0);
}

async function loadGroup(group=0){
    $('#troops').html('');
    $('#cnt_village').text('Betöltés...');
    villages=0;
    selectedGroup=group;
    army={home:{},onWay:{},inSupp:{},all:{}};
    units=[];
    groups=[];
    let result = await $.ajax({url: createLink(0,group)});
    fetchUnitTypes(result); 
    fetchGroups(result);
    appendToArmy(result);
    if(pageCnt>0){
        window.top.UI.InfoMessage(1+'/'+pageCnt);
    }
    var promises = [];

    for (let i = 1; i < pageCnt; i++) {
        promises.push(
            pageRequestDelayed(createLink(i,group),i)
        );
    }
    await Promise.allSettled(promises).then((results) => results.forEach((result) => appendToArmy(result.value)));
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
                window.top.UI.InfoMessage(delay+1+'/'+pageCnt);
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
    let groups=[];
    let groupsHtml = $(html).find('.group-menu-item').get();
    groupsHtml.forEach(group => {
        groups.push({
            text:$(group).text().trim().slice(1,-1),
            value:$(group).attr('data-group-id')
        });
    });

    let select=$($(html).find('.paged-nav-item').get()[0]).parent().find('select');

    if(select.length==1){
        let opt = select.find('option');
        pageCnt = opt.length-1;
    }else{
        pageCnt = $(html).find('.paged-nav-item').length;
    }

    let groupOptions='';
    groups.forEach((group)=>{
        groupOptions+=`<option value="${group.value}" ${selectedGroup==group.value? "selected":""}>${group.text}</option>`;
    })
    $('#Groups').html(groupOptions);

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
            table+=`<tr><th style="width:20px"><img src="${units[i].img}"></th><td bgcolor="#fff5da" style="width: calc(50% - 20px)">${army[filter][units[i].name]}</td>`;
            clipBoard+=`[unit]${units[i].name}[/unit] ${army[filter][units[i].name].toString().padEnd(max,'\u2007')}`;
        }else{
            table+=`<th style="width:20px"><img src="${units[i].img}"></th><td bgcolor="#fff5da" style="width: calc(50% - 20px)">${army[filter][units[i].name]}</td></tr>`;
            clipBoard+=`[unit]${units[i].name}[/unit] ${army[filter][units[i].name]}\n`;
        }
    }
    
    $('#troops').html(table);
}

function copyToClipBoard(isWebview){
    if(isWebview){
        $('#textarea-copy').find('textarea').html(clipBoard);
        $('#textarea-copy').show();
    }else{
        navigator.clipboard.writeText(clipBoard).then(()=>{
            window.top.UI.InfoMessage('A csapatok a vágólapra lettek másolva');
        }).catch(()=>{
            $('#textarea-copy').find('textarea').html(clipBoard);
            $('#textarea-copy').show();
        })
    }
}

$('.popup_box_close').on('click',()=>{
    canceled=true;
})

function checkAgent(){
    let navigator = window.navigator;
    let userAgent = navigator.userAgent;
    let normalizedUserAgent = userAgent.toLowerCase();
    let standalone = navigator.standalone;
    let isIos = /ip(ad|hone|od)/.test(normalizedUserAgent);
    let isAndroid = /android/.test(normalizedUserAgent);
    let isSafari = /safari/.test(normalizedUserAgent);
    let isWebview = (isAndroid && /; wv\)/.test(normalizedUserAgent)) || (isIos && !standalone && !isSafari);
    return isWebview;
}

function renderWindow(){
    let isWebview=checkAgent();
    let win=`<h2 align="center">Sereg számláló</h2>
    <p align="right"><small>- v2.0 by <font face="" color="red"><b>toldi26</b></font></small></p>
    <table width="100%">
        <tbody>
            <tr>
                <th>
                Csoportok: 
                <select value="0" id="Groups" onchange="loadGroup(this.value);">
                </select>
                </th>
            </tr>
            <tr>
                <td>
                    <table width="100%">
                        <tbody>
                            <tr>
                                <th colspan="4">Szűrés: <select onchange="renderTroops(this.value);">
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
                        onclick="copyToClipBoard(${isWebview ?'true':'false'});">${isWebview ?'Másolás':'Vágólapra'}</a></th>
            </tr>
            <tr id="textarea-copy" style="display:none;">
                <td>
                <textarea style="height:100px;width:96%;resize: none;"></textarea>
                </td>
            </tr>
        </tbody>
    </table>`
    Dialog.show("win_troop_count",win);
}
