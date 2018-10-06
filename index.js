const Realm = require('realm')
const uuid = require('uuid/v4')
const db = require('./dbs')
const axios = require('axios').default
const ProgressBar = require('progress')
const AgentInfo = {
    agent: "ikaWidget2stat.ink",
    agent_version: "1.0.0",
    automated: "yes",
}
class MultiTask {
    constructor (count) {
        this.count = count
        this.queue = []
        this.running = 0
        this.waiting = []
    }
    append (promiseFactory) {
        return new Promise((res, rej) => {
            this.queue.push({
                fac: promiseFactory,
                res,
                rej
            })
            this.runner()
        })
    }
    async runner () {
        if (this.running < this.count) {
            const { fac, res, rej } = this.queue.shift()
            try {
                this.running++
                await fac()
                res()
            } catch (e) {
                console.error('Error while run', e)
                rej(e)
            } finally {
                this.running--
            }
            this.afterRun()
        }
    }
    afterRun () {
        if (this.queue.length > 0) {
            this.runner()
        }
        if (this.queue.length === 0) {
            const waiting = this.waiting
            this.waiting = []
            for (let res of waiting) {
                res()
            }
        }
    }
    waitAll () {
        return new Promise(res => {
            if (this.queue.length === 0) {
                return res()
            }
            this.waiting.push(res)
        })
    }
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
        secondary_abilities: skills.sub.map(i => skill(i.ID))
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
    let i = 0
    let s = (a, b) => b.sortScore - a.sortScore
    
    if (result.game.ruleKey === 'turf_war') {
        s = (a, b) => b.paintPoint - a.paintPoint
    }

    const f = p => ({
        is_me: p.name === result.player.name ? 'yes' : 'no',
        weapon: `#${p.weapon.ID}`,
        level: p.rank,
        star_rank: p.starRank,
        rank: p.udemaeName.toLowerCase(),
        rank_exp: p.sPlusNumber,
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

    i = 0
    for (let p of myTeam.sort(s)) {
        ret.push({
            team: 'my',
            ...f(p)
        })
    }
    i = 0
    for (let p of otherTeam.sort(s)) {
        ret.push({
            team: 'his',
            ...f(p)
        })
    }
    if (result.game.ruleKey === 'turf_war') {
        for (let p of ret.filter(i => i.team === (result.win ? 'my' : 'his'))) {
            p.point += 1000
        }
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
    ret.kill = result.player.kill
    ret.death = result.player.death
    ret.kill_or_assist = result.player.allKill
    ret.special = result.player.special
    ret.level = result.player.rank
    ret.star_rank = result.player.starRank
    ret.rank = result.player.udemaeName.toLocaleLowerCase()
    ret.rank_exp = result.player.sPlusNumber
    if (ret.mode === 'gachi') {
        ret.x_power = result.xPower
        ret.estimate_x_power = result.gachiEstimateXPower
        ret.estimate_gachi_power = result.gachiEstimatePower
    }
    ret.my_point = result.player.paintPoint
    if (result.game.ruleKey === 'turf_war') {
        ret.my_point += result.win ? 1000 : 0
    }
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
    if (result.fes) {
        ret.fest_title = db.fest_ranks[result.player.fesGrade]
        ret.fest_exp = result.player.fesPoint
        ret.fest_power = result.fesPower
        ret.my_team_estimate_fest_power = result.fesTeamEstimatePower
        ret.his_team_estimate_fest_power = result.fesOtherEstimatePower
        ret.my_team_fest_theme = result.fes.myTheme
        ret.his_team_fest_theme = result.fes.otherTheme
    }
    ret.start_at = parseInt((new Date(result.startTime)).getTime() / 1000)
    if (result.game.ruleKey === 'turf_war') {
        ret.end_at = ret.start_at + 300
    } else {
        ret.end_at = ret.start_at + result.elapsedTime
    }
    ret.gears = player2gears(result.player)
    ret.players = playerList(result)

    ret.rank_in_team = ret.players.filter(i => i.is_me === 'yes')[0].rank_in_team
    return ret
}

/**
 * @param {Result} result 
 */
async function postBattle (result, test = false) {
    const key = process.argv[3]
    const url  = 'https://stat.ink/api/v2/battle'
    const headers = {
        'Authorization': `Bearer ${key}`
    }

    let statResult = result2stat(result)

    if (test) statResult.test = 'dry_run'
    try {
        res = await axios.post(url, statResult, {
            headers
        })
    } catch (e) {
        console.error(e.response.data, statResult.splatnet_number)
    }
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
    const multi = new MultiTask(10)
    let existSet = []
    let results = realm.objects('Result')

    const bar = new ProgressBar('[:bar] :percent eta: :eta s', {
        complete: '=',
        incomplete: ' ',
        width: 50,
        total: results.length
    })

    console.log('Getting user-battle...')
    let res = await axios.get(`https://stat.ink/api/v2/user-battle?only=splatnet_number&count=1000`, {
        headers
    })
    existSet = res.data
    console.log(`Got ${existSet.length} records`)
    for (let result of results) {
        multi.append(async () => {
            bar.tick()
            if (!existSet.includes(result.no)) {
                await postBattle(result)
            }
        })
    }
    await multi.waitAll()

    realm.close()
    process.exit(0)
}
main().catch(e => console.error(e))
