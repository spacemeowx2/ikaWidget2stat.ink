interface Stage {
    ID: number
}
interface Game {
    key: string
    type: string
    modeKey: string
    ruleKey: string
}
interface Weapon {
    ID: number
}
interface Gear {
    ID: number
}
interface Skill {
    ID: number
}
interface GearSkill {
    main: Skill
    sub: Skill[]
}
interface Player {
    name: string
    principalID: string
    rank: number
    weapon: Weapon
    sortScore: number
    kill: number
    death: number
    assist: number
    special: number
    allKill: number
    paintPoint: number
    udemae: number
    udemaeName: string
    udemaeIsX: boolean
    udemaeIsReached: boolean
    starRank: number

    headGear: Gear
    clothesGear: Gear
    shoesGear: Gear
    headSkills: GearSkill
    clothesSkills: GearSkill
    shoesSkills: GearSkill
}
interface Result {
    no: number
    stage: Stage
    game: Game
    player: Player
    win: boolean
    myCount: number
    otherCount: number
    xPower: number
    gachiEstimateXPower: number
    gachiEstimatePower: number
    leaguePower: number
    leagueMaxPower: number
    leagueTeamEstimatePower: number
    leagueOtherEstimatePower: number
    fesPoint: number
    fesPower: number
    fesMaxPower: number
    fesTeamEstimatePower: number
    fesOtherEstimatePower: number
    startTime: string
    elapsedTime: number
    myMembers: Player[]
    otherMembers: Player[]

}
type RankStr = 'c-' | 'c' | 'c+' | 'b-' | 'b' | 'b+' | 'a-' | 'a' | 'a+' | 's' | 's+' | 'x'
type FestTitleStr = 'fanboy' | 'fiend' | 'defender' | 'champion' | 'king'
interface StatGear {
    gear: string
    primary_ability: string
    secondary_abilities: [string | null, string | null, string | null]
}
interface StatGears {
    headgear: StatGear
    clothing: StatGear
    shoes: StatGear
}
interface StatPlayer {
    team: 'my' | 'his'
    is_me: 'yes' | 'no'
    weapon: string
    level: number
    star_rank: string
    rank: RankStr
    rank_in_team: number
    kill: number
    death: number
    kill_or_assist: number
    special: number
    point: number
    my_kill: number
    name: string
    species: 'inkling' | 'octoling'
    gender: 'boy' | 'girl'
    fest_title: FestTitleStr
    top_500: boolean
    splatnet_id: string
}
interface StatResult {
    uuid: string
    splatnet_number: number
    lobby: 'standard' | 'squad_2' | 'squad_4' | 'private'
    mode: 'regular' | 'gachi' | 'fest' | 'private'
    rule: 'nawabari' | 'area' | 'yagura' | 'hoko' | 'asari'
    stage: string
    weapon: string
    result: 'win' | 'lose'
    knock_out: 'yes' | 'no'
    rank_in_team: number // 1-4
    kill: number
    death: number
    max_kill_combo: number
    max_kill_streak: number
    kill_or_assist: number
    special: number
    level: number
    level_after: number
    star_rank: number
    rank: RankStr
    rank_exp: number
    rank_after: RankStr
    rank_exp_after: number
    x_power: number
    x_power_after: number
    estimate_x_power: number
    my_point: number
    estimate_gachi_power: number
    league_point: number
    my_team_estimate_league_point: number
    his_team_estimate_league_point: number

    my_team_point: number
    his_team_point: number
    my_team_percent: number
    his_team_percent: number
    my_team_count: number
    his_team_count: number
    my_team_id: string
    his_team_id: string
    species: 'inkling' | 'octoling'
    gender: 'boy' | 'girl'
    fest_title: FestTitleStr
    fest_exp: number
    fest_title_after: FestTitleStr
    fest_exp_after: number
    fest_power: number
    my_team_estimate_fest_power: number
    his_team_estimate_fest_power: number
    my_team_fest_theme: string
    his_team_fest_theme: string
    gears: StatGears
    players: StatPlayer[]
    death_reasons: Record<string, string>
    events: Array<any>
    splatnet_json: any
    automated: 'yes' | 'no'
    link_url: string
    note: string
    private_note: string
    agent: string
    agent_version: string
    agent_custom: string
    agent_variables: Record<string, string>
    start_at: number
    end_at: number
}
