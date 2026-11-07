import {
  adminCreateBlogPostProcedure,
  adminDeleteBlogPostProcedure,
  adminGetBlogPostProcedure,
  adminListBlogPostsProcedure,
  adminSetBlogPostStatusProcedure,
  adminUpdateBlogPostProcedure,
  getBlogPostProcedure,
  listBlogPostsProcedure,
} from "~/orpc/blog/procedure";
import {
  addToCartProcedure,
  clearCartProcedure,
  getCartProcedure,
  mergeCartProcedure,
  removeFromCartProcedure,
  setCartPlaceProcedure,
} from "~/orpc/cart/procedure";
import {
  adminIssueCertificateProcedure,
  adminListCertificatesProcedure,
  adminRevokeCertificateProcedure,
  listMyCertificatesProcedure,
  verifyCertificateProcedure,
} from "~/orpc/certificate/procedure";
import {
  adminDogEligibilityProcedure,
  adminListPaymentsProcedure,
  dogEligibilityProcedure,
  listMyPaymentsProcedure,
  myDogCoursesProcedure,
  payCartProcedure,
  reviewCartProcedure,
} from "~/orpc/checkout/procedure";
import {
  adminListCommissionsProcedure,
  adminMarkCommissionPaidProcedure,
  listMyCommissionsProcedure,
} from "~/orpc/commission/procedure";
import {
  adminCreateCourseProcedure,
  adminGetCourseProcedure,
  adminListCoursesProcedure,
  adminMoveCourseProcedure,
  adminSetCourseStatusProcedure,
  adminUpdateCourseProcedure,
  getCourseProcedure,
  listCoursesProcedure,
} from "~/orpc/course/procedure";
import { acceptSiteRulesProcedure, consentStatusProcedure } from "~/orpc/consent/procedure";
import { adminOverviewProcedure } from "~/orpc/dashboard/procedure";
import {
  adminGetDogProcedure,
  adminListDogsProcedure,
  adminUpdateDogProcedure,
  createDogProcedure,
  getDogProcedure,
  listDogsProcedure,
  setPassedCourseProcedure,
  updateDogProcedure,
} from "~/orpc/dog/procedure";
import {
  adminCancelEnrollmentProcedure,
  adminCompleteEnrollmentProcedure,
  adminListEnrollmentsProcedure,
  listMyEnrollmentsProcedure,
} from "~/orpc/enrollment/procedure";
import {
  adminEvaluateProcedure,
  adminGetEvaluationProcedure,
  adminListEvaluationsProcedure,
  adminMarkEvaluatedProcedure,
  adminRejectProcedure,
  listMyEvaluationsProcedure,
  requestEvaluationProcedure,
  withdrawEvaluationProcedure,
} from "~/orpc/evaluation/procedure";
import { implementer } from "~/orpc/implementer.server";
import {
  adminAddEntryProcedure,
  adminListLogbookProcedure,
  adminUpdateEntryProcedure,
  listLogbookProcedure,
  locateDogProcedure,
  publicStatusProcedure,
  recordProcedure,
  setPublicProcedure,
} from "~/orpc/logbook/procedure";
import { uploadMediaProcedure } from "~/orpc/media/procedure";
import {
  acceptMyTermsProcedure,
  addLeadProcedure,
  adminCreatePartnerProcedure,
  adminListPartnersProcedure,
  adminSetPartnerActiveProcedure,
  getMyPartnerProfileProcedure,
  isPartnerPhoneProcedure,
  listMyLeadsProcedure,
  updateMyPartnerProfileProcedure,
} from "~/orpc/partner/procedure";
import {
  adminApproveApplicationProcedure,
  adminListApplicationsProcedure,
  adminRejectApplicationProcedure,
  applyProcedure,
} from "~/orpc/partner_application/procedure";
import { passwordStatusProcedure, setPasswordProcedure } from "~/orpc/password/procedure";
import {
  adminCancelRefundProcedure,
  adminCreateRefundProcedure,
  adminListRefundsProcedure,
  adminMarkRefundPaidProcedure,
  listMyRefundsProcedure,
} from "~/orpc/refund/procedure";
import { getSessionProcedure } from "~/orpc/session/procedure";
import { adminListSmsProcedure } from "~/orpc/sms/procedure";
import {
  adminGetCommissionTiersProcedure,
  adminGetSettingsProcedure,
  adminUpdateCommissionTiersProcedure,
  adminUpdateSettingProcedure,
  commissionTiersProcedure,
} from "~/orpc/setting/procedure";
import { siteConfigProcedure } from "~/orpc/site/procedure";
import { adminListUsersProcedure, adminSetUserStatusProcedure, adminUpdateUserProcedure } from "~/orpc/user/procedure";

/*===== API Router =====*/
// Assembled with the undecorated implementer (see `implementer.server.ts`).
export const router = implementer.router({
  blog: {
    list: listBlogPostsProcedure,
    get: getBlogPostProcedure,
    admin: {
      list: adminListBlogPostsProcedure,
      get: adminGetBlogPostProcedure,
      create: adminCreateBlogPostProcedure,
      update: adminUpdateBlogPostProcedure,
      setStatus: adminSetBlogPostStatusProcedure,
      delete: adminDeleteBlogPostProcedure,
    },
  },
  cart: {
    get: getCartProcedure,
    add: addToCartProcedure,
    remove: removeFromCartProcedure,
    clear: clearCartProcedure,
    merge: mergeCartProcedure,
    setPlace: setCartPlaceProcedure,
  },
  certificate: {
    listMine: listMyCertificatesProcedure,
    verify: verifyCertificateProcedure,
    admin: {
      list: adminListCertificatesProcedure,
      issue: adminIssueCertificateProcedure,
      revoke: adminRevokeCertificateProcedure,
    },
  },
  checkout: {
    eligibility: dogEligibilityProcedure,
    dogCourses: myDogCoursesProcedure,
    review: reviewCartProcedure,
    pay: payCartProcedure,
    payments: listMyPaymentsProcedure,
    admin: {
      payments: adminListPaymentsProcedure,
      dogEligibility: adminDogEligibilityProcedure,
    },
  },
  commission: {
    listMine: listMyCommissionsProcedure,
    admin: {
      list: adminListCommissionsProcedure,
      markPaid: adminMarkCommissionPaidProcedure,
    },
  },
  consent: {
    status: consentStatusProcedure,
    acceptSiteRules: acceptSiteRulesProcedure,
  },
  course: {
    list: listCoursesProcedure,
    get: getCourseProcedure,
    admin: {
      list: adminListCoursesProcedure,
      get: adminGetCourseProcedure,
      create: adminCreateCourseProcedure,
      update: adminUpdateCourseProcedure,
      setStatus: adminSetCourseStatusProcedure,
      move: adminMoveCourseProcedure,
    },
  },
  dashboard: {
    admin: {
      overview: adminOverviewProcedure,
    },
  },
  dog: {
    list: listDogsProcedure,
    get: getDogProcedure,
    create: createDogProcedure,
    update: updateDogProcedure,
    admin: {
      list: adminListDogsProcedure,
      get: adminGetDogProcedure,
      update: adminUpdateDogProcedure,
      setPassedCourse: setPassedCourseProcedure,
    },
  },
  enrollment: {
    listMine: listMyEnrollmentsProcedure,
    admin: {
      list: adminListEnrollmentsProcedure,
      complete: adminCompleteEnrollmentProcedure,
      cancel: adminCancelEnrollmentProcedure,
    },
  },
  evaluation: {
    request: requestEvaluationProcedure,
    withdraw: withdrawEvaluationProcedure,
    listMine: listMyEvaluationsProcedure,
    admin: {
      list: adminListEvaluationsProcedure,
      get: adminGetEvaluationProcedure,
      evaluate: adminEvaluateProcedure,
      reject: adminRejectProcedure,
      markEvaluated: adminMarkEvaluatedProcedure,
    },
  },
  logbook: {
    locate: locateDogProcedure,
    record: recordProcedure,
    list: listLogbookProcedure,
    publicStatus: publicStatusProcedure,
    setPublic: setPublicProcedure,
    admin: {
      list: adminListLogbookProcedure,
      add: adminAddEntryProcedure,
      update: adminUpdateEntryProcedure,
    },
  },
  media: {
    upload: uploadMediaProcedure,
  },
  partner: {
    getMine: getMyPartnerProfileProcedure,
    updateMine: updateMyPartnerProfileProcedure,
    acceptTerms: acceptMyTermsProcedure,
    isPartnerPhone: isPartnerPhoneProcedure,
    leads: {
      list: listMyLeadsProcedure,
      add: addLeadProcedure,
    },
    admin: {
      list: adminListPartnersProcedure,
      create: adminCreatePartnerProcedure,
      setActive: adminSetPartnerActiveProcedure,
    },
  },
  partnerApplication: {
    apply: applyProcedure,
    admin: {
      list: adminListApplicationsProcedure,
      approve: adminApproveApplicationProcedure,
      reject: adminRejectApplicationProcedure,
    },
  },
  password: {
    status: passwordStatusProcedure,
    set: setPasswordProcedure,
  },
  refund: {
    listMine: listMyRefundsProcedure,
    admin: {
      list: adminListRefundsProcedure,
      create: adminCreateRefundProcedure,
      markPaid: adminMarkRefundPaidProcedure,
      cancel: adminCancelRefundProcedure,
    },
  },
  session: {
    get: getSessionProcedure,
  },
  sms: {
    admin: {
      list: adminListSmsProcedure,
    },
  },
  setting: {
    commissionTiers: commissionTiersProcedure,
    admin: {
      get: adminGetSettingsProcedure,
      update: adminUpdateSettingProcedure,
      commissionTiers: adminGetCommissionTiersProcedure,
      updateCommissionTiers: adminUpdateCommissionTiersProcedure,
    },
  },
  site: {
    config: siteConfigProcedure,
  },
  user: {
    admin: {
      list: adminListUsersProcedure,
      update: adminUpdateUserProcedure,
      setStatus: adminSetUserStatusProcedure,
    },
  },
});
