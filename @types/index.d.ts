interface DiceRoller {
    getRoller(roll: string, source?: string): Promise<BasicRoller>;
    getRollerSync(roll: string, source?: string): BasicRoller;
}

interface BasicRoller {
    result: any;
    roll(): Promise<any>;
    rollSync(): number;
}

interface StackRoller extends BasicRoller {
    result: number;
}
export default DiceRoller;
export { StackRoller };
