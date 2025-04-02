;; License Terms Trait
;; Defines the interface for the License Terms contract

(define-trait license-terms-trait
  (
    ;; Get license information
    (get-license (uint) (response (optional {
      ip-id: uint,
      licensor: principal,
      license-type: (string-utf8 64),
      usage-rights: (string-utf8 1024),
      royalty-percentage: uint,
      duration: uint,
      created-at: uint,
      active: bool
    }) uint))

    ;; Get IP licenses
    (get-ip-licenses (uint) (response {
      license-ids: (list 100 uint)
    } uint))

    ;; Get licensee agreement
    (get-licensee-agreement (principal uint) (response (optional {
      accepted: bool,
      accepted-at: uint,
      expires-at: uint,
      active: bool
    }) uint))

    ;; Create license
    (create-license (principal uint (string-utf8 64) (string-utf8 1024) uint uint) (response uint uint))

    ;; Accept license
    (accept-license (uint) (response bool uint))

    ;; Deactivate license
    (deactivate-license (uint) (response bool uint))
  )
)

