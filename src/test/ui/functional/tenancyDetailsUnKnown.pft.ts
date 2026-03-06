import { tenancyStartDateUnKnown } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function tenancyStartDateUnKnownErrorValidation(): Promise<void> {
//This error message will trigger if no date is provided
console.log("inside validation")
  await performAction('inputText',tenancyStartDateUnKnown.monthTextLabel,tenancyStartDateUnKnown.monthInputText);
  await performAction('inputText',tenancyStartDateUnKnown.yearTextLabel,tenancyStartDateUnKnown.yearInputText);
  await performAction('clickButton', tenancyStartDateUnKnown.saveAndContinueButton);
  await performValidation('errorMessage',{header: tenancyStartDateUnKnown.thereIsAProblemErrorMessageHeader,message: tenancyStartDateUnKnown.thereIsAProblemErrorMessageHeader});
  await performValidation('errorMessage', {header: tenancyStartDateUnKnown.thereIsAProblemErrorMessageHeader,message: tenancyStartDateUnKnown.tenancyStartDateMustIncludeDay});

//This error message will trigger if no month value is provided
  await performAction('inputText',tenancyStartDateUnKnown.dayTextLabel,tenancyStartDateUnKnown.dayInputText);
  await performAction('inputText',tenancyStartDateUnKnown.yearTextLabel,tenancyStartDateUnKnown.yearInputText);
  await performAction('clickButton', tenancyStartDateUnKnown.saveAndContinueButton);
  await performValidation('errorMessage',{header: tenancyStartDateUnKnown.thereIsAProblemErrorMessageHeader,message: tenancyStartDateUnKnown.thereIsAProblemErrorMessageHeader});
  await performValidation('errorMessage', {header: tenancyStartDateUnKnown.thereIsAProblemErrorMessageHeader,message: tenancyStartDateUnKnown.tenancyStartDateMustIncludeMonth});
  
//This error message will trigger if no year value is provided
  await performAction('inputText',tenancyStartDateUnKnown.dayTextLabel,tenancyStartDateUnKnown.dayInputText);
  await performAction('inputText',tenancyStartDateUnKnown.monthTextLabel,tenancyStartDateUnKnown.monthInputText);
  await performAction('clickButton', tenancyStartDateUnKnown.saveAndContinueButton);
  await performValidation('errorMessage',{header: tenancyStartDateUnKnown.thereIsAProblemErrorMessageHeader,message: tenancyStartDateUnKnown.thereIsAProblemErrorMessageHeader});
  await performValidation('errorMessage', {header: tenancyStartDateUnKnown.thereIsAProblemErrorMessageHeader,message: tenancyStartDateUnKnown.tenancyStartDateMustIncludeYear});



  }
