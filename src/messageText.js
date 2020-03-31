const newEdMessage = ({ productName, diagnosis, link }) => {
  return `Dear ${firstName},/nThank you for choosing Victory Select for your healthcare needs.
I am William Franklin. I have reviewed the health history information you provided online.
Your diagnosis is ${diagnosis} and I feel you would benefit from ${productName}./n
Your prescription has been sent to The Daily Dose pharmacy and will be mailed 
out directly to the address you provided./n
Make sure to click on the treatment plan below prior to taking any medications. 
The treatment plan will help clarify the benefits, risks, and alternative treatment options.
This includes opting for no treatment at all.
<a href=${planUrl}>Treatment Plan</a>
Your package insert contains a full list of potential side effects and warnings and we encourage you to review this information.
Please feel free to contact me with any additional questions or concerns,
Sincerely,
(Insert Dr. Name)
(Insert link to Dr. bio)`;
};
