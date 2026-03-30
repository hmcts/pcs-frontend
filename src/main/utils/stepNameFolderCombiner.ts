/**
 * @param journeyFolder - The folder containing the step
 * @param stepName - The name of the step
 * @returns concatenated journeyFolder and step name with forward slash separator
 */
export function concatenateJourneyStepName(stepName: string, journeyFolder?: string): string {

    if(journeyFolder) {
        return journeyFolder + "/" + stepName;
    }
    return stepName;
}
