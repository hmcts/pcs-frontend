# NestJS Adoption Spike - pcs-frontend

## Project Context

I've recently onboarded to the [pcs-frontend project](https://github.com/hmcts/pcs-frontend) and have been tasked with conducting a spike to evaluate the viability of using **NestJS** as a framework to bootstrap the current Express setup.

## Objectives

### Primary Goal
Assess whether NestJS can enhance the current Express-based architecture while maintaining compatibility with existing functionality.

### Deliverables
Please refer to `pcs-frontend/docs/hdpi-3810` for the complete Jira ticket brief and detailed deliverables.

## Requirements

### 1. Analysis & Evaluation
- **Pros and Cons**: Provide a comprehensive analysis of NestJS benefits versus potential drawbacks
- **Migration Plan**: Devise a phased migration strategy aligned with the spike brief
- **Current State Assessment**: Identify areas of the current implementation that could benefit from refactoring or alternative approaches (outside of NestJS-specific improvements)

### 2. Prioritization
- **Primary Focus**: NestJS implementation and integration
- **Secondary Focus**: General architectural improvements (if time permits)

### 3. Communication Approach
- Present findings in a **diplomatic and collaborative manner** that encourages discussion
- Avoid prescriptive language; focus on evidence-based recommendations
- Acknowledge this is early-stage exploration for the HMCTS project
- Consider potential resistance and address concerns proactively

### 4. Technical Considerations
- **Architecture**: pcs-frontend is a standalone codebase that will be bootstrapped with NestJS
- **Dependencies**: The frontend sits alongside 2 other repositories in the HMCTS workspace (`/https` directory) that provide database and API connectivity
- **Integration**: Ensure compatibility with existing inter-repository dependencies

## Next Steps

Once the analysis and migration plan are documented:
1. Review and validate the proposed approach
2. Proceed with the **first vertical slice implementation** as outlined in the plan
3. Document findings and lessons learned for team discussion