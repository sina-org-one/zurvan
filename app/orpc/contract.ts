import { blogContract } from "~/orpc/blog/contract";
import { cartContract } from "~/orpc/cart/contract";
import { certificateContract } from "~/orpc/certificate/contract";
import { checkoutContract } from "~/orpc/checkout/contract";
import { commissionContract } from "~/orpc/commission/contract";
import { consentContract } from "~/orpc/consent/contract";
import { courseContract } from "~/orpc/course/contract";
import { dashboardContract } from "~/orpc/dashboard/contract";
import { dogContract } from "~/orpc/dog/contract";
import { enrollmentContract } from "~/orpc/enrollment/contract";
import { evaluationContract } from "~/orpc/evaluation/contract";
import { logbookContract } from "~/orpc/logbook/contract";
import { mediaContract } from "~/orpc/media/contract";
import { partnerContract } from "~/orpc/partner/contract";
import { partnerApplicationContract } from "~/orpc/partner_application/contract";
import { passwordContract } from "~/orpc/password/contract";
import { refundContract } from "~/orpc/refund/contract";
import { sessionContract } from "~/orpc/session/contract";
import { settingContract } from "~/orpc/setting/contract";
import { siteContract } from "~/orpc/site/contract";
import { smsContract } from "~/orpc/sms/contract";
import { userContract } from "~/orpc/user/contract";

/*===== API Contract =====*/
// Source of truth for the API. The browser client is typed from this, never from the router.
export const contract = {
  blog: blogContract,
  cart: cartContract,
  certificate: certificateContract,
  checkout: checkoutContract,
  commission: commissionContract,
  consent: consentContract,
  course: courseContract,
  dashboard: dashboardContract,
  dog: dogContract,
  enrollment: enrollmentContract,
  evaluation: evaluationContract,
  logbook: logbookContract,
  media: mediaContract,
  partner: partnerContract,
  partnerApplication: partnerApplicationContract,
  password: passwordContract,
  refund: refundContract,
  session: sessionContract,
  setting: settingContract,
  site: siteContract,
  sms: smsContract,
  user: userContract,
};
