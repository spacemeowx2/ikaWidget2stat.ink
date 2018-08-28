const Realm = require('realm')
const uuid = require('uuid/v4')
const db = require('./dbs')
const axios = require('axios').default
const AgentInfo = {
    agent: "ikaWidget2stat.ink",
    agent_version: "1.0.0",
    automated: "yes",
}
/**
 * Convert ikaWidget2's Player to StatGears
 * @param {Player} player 
 * @returns {StatGears}
 */
function player2gears (player) {
    const skill = id => {
        if (id === 255) return null
        return db.abilities[id]
    }
    const f = (gear, skills) => ({
        gear: `#${gear.ID}`,
        primary_ability: skill(skills.main.ID),
        secondary_abilities: [
            skill(skills.sub[0].ID),
            skill(skills.sub[1].ID),
            skill(skills.sub[2].ID)
        ]
    })
    return {
        headgear: f(player.headGear, player.headSkills),
        clothing: f(player.clothesGear, player.clothesSkills),
        shoes: f(player.shoesGear, player.shoesSkills),
    }
}
/**
 * @param {Result} result 
 * @returns {StatPlayer[]}
 */
function playerList (result) {
    /** @type {StatPlayer[]} */
    let ret = []
    let myTeam = [result.player, ...result.myMembers]
    let otherTeam = [...result.otherMembers]
    let i
    const s = (a, b) => b.sortScore - a.sortScore
    const f = p => ({
        is_me: p.name === result.player.name ? 'yes' : 'no',
        weapon: `#${p.weapon.ID}`,
        level: p.rank,
        star_rank: p.starRank,
        rank: p.udemaeName.toLowerCase(),
        rank_in_team: ++i,
        kill: p.kill,
        death: p.death,
        kill_or_assist: p.allKill,
        special: p.special,
        point: p.paintPoint,
        my_kill: p.kill,
        name: p.name,
        splatnet_id: p.principalID
    })

    for (let p of myTeam.sort(s)) {
        ret.push({
            team: 'my',
            ...f(p)
        })
    }
    for (let p of otherTeam.sort(s)) {
        ret.push({
            team: 'his',
            ...f(p)
        })
    }
    return ret
}
/**
 * Convert ikaWidget2's result into stat.ink's API format
 * @param {Result} result 
 * @returns {StatResult}
 */
function result2stat (result) {
    const mapModeLobby = {
        'league_pair': 'squad_2',
        'league_team': 'squad_4',
        'gachi': 'standard',
        'private': 'private',
        'regular': 'standard',
        'fes_solo': 'standard',
        'fes_team': 'standard'
    }
    const mapModeMode = {
        'league_pair': 'gachi',
        'league_team': 'gachi',
        'gachi': 'gachi',
        'private': 'private',
        'regular': 'regular',
        'fes_solo': 'fest',
        'fes_team': 'fest'
    }
    const mapRuleRule = {
        'clam_blitz': 'asari',
        'rainmaker': 'hoko',
        'splat_zones': 'area',
        'tower_control': 'yagura',
        'turf_war': 'nawabari'
    }
    /** @type {StatResult} */
    let ret = {
        ...AgentInfo
    }
    ret.uuid = uuid()
    ret.splatnet_number = result.no
    ret.lobby = mapModeLobby[result.game.modeKey]
    ret.mode = mapModeMode[result.game.modeKey]
    ret.rule = mapRuleRule[result.game.ruleKey]
    ret.stage = `#${result.stage.ID}`
    ret.weapon = `#${result.player.weapon.ID}`
    ret.result = result.win ? 'win' : 'lose'
    ret.knock_out = result.myCount === 100 ? 'yes' : 'no' // ?
    ret.rank_in_team = result.player.sortScore
    ret.kill = result.player.kill
    ret.death = result.player.death
    ret.kill_or_assist = result.player.allKill
    ret.special = result.player.special
    ret.level = result.player.rank
    // ret.level_after = result.player.rank // not record
    ret.star_rank = result.player.starRank
    ret.rank = result.player.udemaeName.toLocaleLowerCase()
    ret.x_power = result.xPower
    ret.estimate_x_power = result.gachiEstimateXPower
    if (result.game.ruleKey === 'turf_war') {
        ret.my_point = result.player.paintPoint + result.win ? 1000 : 0
    } else {
        ret.my_point = result.player.paintPoint
    }
    ret.estimate_gachi_power = result.gachiEstimatePower
    ret.league_point = result.leaguePower
    ret.my_team_estimate_league_point = result.leagueTeamEstimatePower
    ret.his_team_estimate_league_point = result.leagueOtherEstimatePower

    if (result.game.ruleKey === 'turf_war') {
        ret.my_team_percent = result.myCount
        ret.his_team_percent = result.otherCount
    } else {
        ret.my_team_count = result.myCount
        ret.his_team_count = result.otherCount
    }
    ret.fest_power = result.fesPower
    ret.my_team_estimate_fest_power = result.fesTeamEstimatePower
    ret.his_team_estimate_fest_power = result.fesOtherEstimatePower
    ret.my_team_fest_theme = result.fes && result.fes.myTheme
    ret.his_team_fest_theme = result.fes && result.fes.otherTheme
    ret.start_at = parseInt((new Date(result.startTime)).getTime() / 1000)
    if (result.game.ruleKey === 'turf_war') {
        ret.end_at = ret.start_at + 300
    } else {
        ret.end_at = ret.start_at + result.elapsedTime
    }
    ret.gears = player2gears(result.player)
    ret.players = playerList(result)
    return ret
}

/**
 * @param {Result} result 
 */
async function postBattle (result, existSet) {
    const key = process.argv[3]
    const url  = 'https://stat.ink/api/v2/battle'
    const headers = {
        'Authorization': `Bearer ${key}`
    }
    return
    let statResult = result2stat(result)
    // statResult.test = 'dry_run'

    res = await axios.post(url, statResult, {
        headers
    })
    console.log(res.data)
}

async function main() {
    const path = process.argv[2]
    const key = process.argv[3]
    const realm = await Realm.open({
        path,
        readOnly: true
    })
    const headers = {
        'Authorization': `Bearer ${key}`
    }
    let existSet = []
    let results = realm.objects('Result')

    console.log('Getting user-battle...')
    let res = await axios.get(`https://stat.ink/api/v2/user-battle?only=splatnet_number&count=1000`, {
        headers
    })
    existSet = res.data
    for (let result of results) {
        await postBattle(result)
    }

    realm.close()
    process.exit(0)
}
main().catch(e => console.error(e))
