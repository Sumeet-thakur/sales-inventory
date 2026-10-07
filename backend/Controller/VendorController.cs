using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data;
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class VendorController : ControllerBase
    {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;
        public VendorController(InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository)
        {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;   
        }

        // GET /api/Vendor
        // Retrieves all active, non-deleted vendors with an index for UI display,
        // only if the current user has "View" permission on the Vendor menu.
        [HttpGet]
        public async Task<IActionResult> GetAllVenders ( )
            {
            // 1️⃣ Permission check: get current user's role and ensure they can view vendors
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Vendor", "Inventory System", "View"))
                return Forbid();  // HTTP 403 if unauthorized

            try
                {
                // 2️⃣ Query the Vendors table for active, non-deleted records
                var customersList = await _context.Vendors
                    .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                    // 3️⃣ Project into a lightweight anonymous type
                    .Select(c => new
                        {
                        c.VendorID,     // primary key
                        c.VendorName,   // display name
                        c.ContactNo,    // phone number
                        c.Email         // email address
                        })
                    .ToListAsync(); // execute the query

                // 4️⃣ Add a 1-based index for display in the UI
                var customers = customersList
                    .Select(( c, index ) => new
                        {
                        Index = index + 1,  // row number starting at 1
                        c.VendorID,
                        c.VendorName,
                        c.ContactNo,
                        c.Email
                        });

                // 5️⃣ Return HTTP 200 OK with the indexed list of vendors
                return Ok(customers);
                }
            catch (Exception ex)
                {
                // 6️⃣ On any exception (e.g., database error), return HTTP 500 with the error message
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        [HttpPost("AddVendor")]
        public async Task<IActionResult> AddVendor([FromBody] VendorRequest vendorRequest)
            {
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Vendor", "Inventory System", "Insert"))
                return Forbid();

            if (vendorRequest == null)
                return BadRequest("Vendor data is null");

            var checkVendor = await _context.Vendors.FirstOrDefaultAsync(i => i.VendorName.Trim() == vendorRequest.VendorName.Trim());
            if (checkVendor != null)
                return BadRequest(new { Succeeded = false, Message = "Vendor Name already exists." });

            // Begin a transaction to ensure atomicity.
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
                {
                // 1. Save the Vendor entity.
                var vendor = new Vendor
                    {
                    VendorName = vendorRequest.VendorName,
                    CityID = vendorRequest.CityID,
                    ContactNo = vendorRequest.ContactNo,
                    Email = vendorRequest.Email,
                    Address = vendorRequest.Address,
                    NTNNo = vendorRequest.NTNNo,
                    OpeningBalance = vendorRequest.OpeningBalance,
                    CreditLimit = vendorRequest.CreditLimit,
                    CreditDays = vendorRequest.CreditDays,
                    CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    CreatedOn = DateTime.Now,
                    IsActive = 1,
                    IsDeleted = 0
                    };

                _context.Vendors.Add(vendor);
                await _context.SaveChangesAsync(); // VendorID is now generated.

                // Prepare lists to capture inserted VendorChild and ContactPersonVendor records.
                var insertedVendorChilds = new List<VendorChild>();
                var insertedContactPersons = new List<ContactPersonVendor>();

                // 2. Save each VendorChild and its related ContactPersonVendor entities.
                if (vendorRequest.VendorChildRequests != null)
                    {
                    foreach (var childRequest in vendorRequest.VendorChildRequests)
                        {
                        var vendorChild = new VendorChild
                            {
                            BranchName = childRequest.BranchName,
                            CityID = childRequest.CityId,
                            VendorID = vendor.VendorID, // assign generated VendorID
                            CreatedOn = DateTime.Now,
                            CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                            IsActive = 1,
                            IsDeleted = 0
                            };

                        _context.VendorChilds.Add(vendorChild);
                        await _context.SaveChangesAsync(); // VendorChildID is now generated.
                        insertedVendorChilds.Add(vendorChild);

                        // 3. For each ContactPersonVendorRequest, save the ContactPersonVendor entity.
                        if (childRequest.ContactPersonVendorRequests != null)
                            {
                            foreach (var contactRequest in childRequest.ContactPersonVendorRequests)
                                {
                                var contactPerson = new ContactPersonVendor
                                    {
                                    VendorID = vendor.VendorID,
                                    VendorChildID = vendorChild.VendorChildID, // assign generated VendorChildID
                                    ContactPersonName = contactRequest.ContactPersonName,
                                    Designation = contactRequest.Designation,
                                    Address = contactRequest.Address,
                                    PhoneNo = contactRequest.PhoneNo,
                                    MobileNo = contactRequest.MobileNo,
                                    Email = contactRequest.Email,
                                    CreatedOn = DateTime.Now,
                                    CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                                    IsActive = 1,
                                    IsDeleted = 0
                                    };

                                _context.ContactPersonVendors.Add(contactPerson);
                                insertedContactPersons.Add(contactPerson);
                                }
                            await _context.SaveChangesAsync();
                            }
                        }
                    }

                // Build a log object containing the inserted data.
                var logVendor = new
                    {
                    Vendor = new
                        {
                        vendor.VendorID,
                        vendor.VendorName,
                        vendor.CityID,
                        vendor.ContactNo,
                        vendor.Email,
                        vendor.Address,
                        vendor.NTNNo,
                        vendor.OpeningBalance,
                        vendor.CreditLimit,
                        vendor.CreditDays,
                        vendor.CreatedOn
                        },
                    VendorChilds = insertedVendorChilds.Select(child => new
                        {
                        child.VendorChildID,
                        child.BranchName,
                        child.CityID,
                        child.CreatedOn,
                        ContactPersons = insertedContactPersons
                            .Where(cp => cp.VendorChildID == child.VendorChildID)
                            .Select(cp => new
                                {
                                cp.ContactPersonID, // assuming auto-generated primary key
                                cp.ContactPersonName,
                                cp.Designation,
                                cp.Address,
                                cp.PhoneNo,
                                cp.MobileNo,
                                cp.Email,
                                cp.CreatedOn
                                }).ToList()
                        }).ToList()
                    };

                // Create the activity log.
                var activityLog = new ActivityLog
                    {
                    MenuItemId = 18,
                    ParentTableId = vendor.VendorID,
                    ActionType = "Create",
                    OldData = "",
                    NewData = System.Text.Json.JsonSerializer.Serialize(logVendor),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                    };

                await _activityLogRepository.Create(activityLog);
                await transaction.CommitAsync();

                return Ok(vendor);
                }
            catch (Exception ex)
                {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // GET /api/Vendor/GetVendorById/{id}
        // Retrieves a single vendor by ID, including its branches and contact persons,
        // after verifying the user has "Update" permission on the Vendor menu.
        [HttpGet("GetVendorById/{id}")]
        public async Task<IActionResult> GetVendorById ( int id )
            {
            // 1️⃣ Permission check: ensure the current user can update vendor records
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Vendor", "Inventory System", "Update"))
                return Forbid();  // HTTP 403 if unauthorized

            try
                {
                // 2️⃣ Load the vendor header plus all related child branches and their contacts
                //    • Filter to active/non-deleted vendors
                //    • Eager-load VendorChilds and then their ContactPersonVendors
                var vendor = await _context.Vendors
                    .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                    .Include(c => c.VendorChilds)
                        .ThenInclude(child => child.ContactPersonVendors)
                    .FirstOrDefaultAsync(c => c.VendorID == id);

                // 2.a) If no such vendor exists, return 404 Not Found
                if (vendor == null)
                    return NotFound();

                // 3️⃣ Map the EF entity into a view model for the client
                var vendorVM = new VendorVM
                    {
                    // -- Header fields --
                    VendorID = vendor.VendorID,
                    VendorName = vendor.VendorName,
                    CityID = vendor.CityID,
                    ContactNo = vendor.ContactNo,
                    Email = vendor.Email,
                    Address = vendor.Address,
                    NTNNo = vendor.NTNNo,
                    OpeningBalance = vendor.OpeningBalance,
                    CreditLimit = vendor.CreditLimit,
                    CreditDays = vendor.CreditDays,

                    // -- Child branches --
                    VendorChildVMs = vendor.VendorChilds
                        .Where(c => c.IsActive == 1 && c.IsDeleted == 0)  // filter active branches
                        .Select(child => new VendorChildVM
                            {
                            VendorChildID = child.VendorChildID,
                            BranchName = child.BranchName,
                            CityId = child.CityID,
                            VendorID = child.VendorID,

                            // -- Nested contacts for each branch --
                            ContactPersonVendorVMs = child.ContactPersonVendors
                                .Where(cp => cp.IsActive == 1 && cp.IsDeleted == 0)  // filter active contacts
                                .Select(cp => new ContactPersonVendorVM
                                    {
                                    ContactPersonID = cp.ContactPersonID,
                                    VendorID = cp.VendorID,
                                    VendorChildID = cp.VendorChildID,
                                    ContactPersonName = cp.ContactPersonName,
                                    Designation = cp.Designation,
                                    Address = cp.Address,
                                    PhoneNo = cp.PhoneNo,
                                    MobileNo = cp.MobileNo,
                                    Email = cp.Email,
                                    })
                                .ToList()
                            })
                        .ToList(),

                    // Placeholder for any branch IDs that may be removed in subsequent updates
                    RemovedCustomerChildIds = new List<int>()
                    };

                // 4️⃣ Return HTTP 200 OK with the populated view model
                return Ok(vendorVM);
                }
            catch (Exception ex)
                {
                // 5️⃣ On unexpected errors (e.g., database issues), return HTTP 500 with the error message
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        [HttpPut("UpdateVendor/{id}")]
        public async Task<IActionResult> UpdateVendor(int id, [FromBody] VendorVM vendorVM)
            {
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Vendor", "Inventory System", "Update"))
                return Forbid();

            if (id != vendorVM.VendorID)
                return BadRequest("Vendor ID mismatch");

            // Begin a transaction.
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
                {
                // Retrieve the existing vendor along with its child branches and their contacts.
                var existingVendor = await _context.Vendors
                    .Include(v => v.VendorChilds)
                        .ThenInclude(child => child.ContactPersonVendors)
                    .FirstOrDefaultAsync(v => v.VendorID == id);

                if (existingVendor == null)
                    return NotFound();

                // Capture the old state for logging (only active records).
                var oldVendor = new
                    {
                    Vendor = new
                        {
                        existingVendor.VendorID,
                        existingVendor.VendorName,
                        existingVendor.CityID,
                        existingVendor.ContactNo,
                        existingVendor.Email,
                        existingVendor.Address,
                        existingVendor.NTNNo,
                        existingVendor.OpeningBalance,
                        existingVendor.CreditLimit,
                        existingVendor.CreditDays
                        },
                    VendorChilds = existingVendor.VendorChilds
                        .Where(child => child.IsDeleted==0)
                        .Select(child => new
                            {
                            child.VendorChildID,
                            child.BranchName,
                            child.CityID,
                            child.CreatedOn,
                            ContactPersons = child.ContactPersonVendors
                                .Where(cp => cp.IsDeleted==0)
                                .Select(cp => new
                                    {
                                    cp.ContactPersonID,
                                    cp.ContactPersonName,
                                    cp.Designation,
                                    cp.Address,
                                    cp.PhoneNo,
                                    cp.MobileNo,
                                    cp.Email,
                                    cp.CreatedOn
                                    }).ToList()
                            }).ToList()
                    };

                // Update main vendor fields.
                existingVendor.VendorName = vendorVM.VendorName;
                existingVendor.CityID = vendorVM.CityID;
                existingVendor.ContactNo = vendorVM.ContactNo;
                existingVendor.Email = vendorVM.Email;
                existingVendor.Address = vendorVM.Address;
                existingVendor.NTNNo = vendorVM.NTNNo;
                existingVendor.OpeningBalance = vendorVM.OpeningBalance;
                existingVendor.CreditLimit = vendorVM.CreditLimit;
                existingVendor.CreditDays = vendorVM.CreditDays;
                existingVendor.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                existingVendor.ModifiedOn = DateTime.Now;

                // Process removal of vendor branches.
                if (vendorVM.RemovedCustomerChildIds != null && vendorVM.RemovedCustomerChildIds.Any())
                    {
                    foreach (var removedChildId in vendorVM.RemovedCustomerChildIds)
                        {
                        var childToMark = existingVendor.VendorChilds.FirstOrDefault(c => c.VendorChildID == removedChildId);
                        if (childToMark != null)
                            {
                            childToMark.IsDeleted = 1;
                            childToMark.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                            childToMark.ModifiedOn = DateTime.Now;
                            }
                        }
                    }

                // Process each branch (VendorChild).
                if (vendorVM.VendorChildVMs != null)
                    {
                    foreach (var childVM in vendorVM.VendorChildVMs)
                        {
                        // Check if this branch already exists.
                        var existingChild = existingVendor.VendorChilds.FirstOrDefault(c => c.VendorChildID == childVM.VendorChildID);

                        if (existingChild != null)
                            {
                            // Update branch fields.
                            existingChild.BranchName = childVM.BranchName;
                            existingChild.CityID = childVM.CityId;

                            // Process removal of contacts.
                            if (childVM.RemovedContactPersonVendorIds != null && childVM.RemovedContactPersonVendorIds.Any())
                                {
                                foreach (var removedContactId in childVM.RemovedContactPersonVendorIds)
                                    {
                                    var contactToMark = existingChild.ContactPersonVendors
                                        .FirstOrDefault(cp => cp.ContactPersonID == removedContactId);
                                    if (contactToMark != null)
                                        {
                                        contactToMark.IsDeleted = 1;
                                        contactToMark.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                                        contactToMark.ModifiedOn = DateTime.Now;
                                        }
                                    }
                                }

                            // Process each contact for this branch.
                            if (childVM.ContactPersonVendorVMs != null)
                                {
                                foreach (var contactVM in childVM.ContactPersonVendorVMs)
                                    {
                                    var existingContact = existingChild.ContactPersonVendors
                                        .FirstOrDefault(cp => cp.ContactPersonID == contactVM.ContactPersonID);
                                    if (existingContact != null)
                                        {
                                        // Update contact fields.
                                        existingContact.ContactPersonName = contactVM.ContactPersonName;
                                        existingContact.Designation = contactVM.Designation;
                                        existingContact.Address = contactVM.Address;
                                        existingContact.PhoneNo = contactVM.PhoneNo;
                                        existingContact.MobileNo = contactVM.MobileNo;
                                        existingContact.Email = contactVM.Email;
                                        existingContact.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                                        existingContact.ModifiedOn = DateTime.Now;
                                        }
                                    else
                                        {
                                        // Add new contact.
                                        var newContact = new ContactPersonVendor
                                            {
                                            VendorID = existingVendor.VendorID,
                                            VendorChildID = existingChild.VendorChildID,
                                            ContactPersonName = contactVM.ContactPersonName,
                                            Designation = contactVM.Designation,
                                            Address = contactVM.Address,
                                            PhoneNo = contactVM.PhoneNo,
                                            MobileNo = contactVM.MobileNo,
                                            Email = contactVM.Email,
                                            CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                                            CreatedOn = DateTime.Now,
                                            IsActive = 1,
                                            IsDeleted = 0
                                            };
                                        existingChild.ContactPersonVendors.Add(newContact);
                                        }
                                    }
                                }
                            }
                        else
                            {
                            // Add new branch.
                            var newChild = new VendorChild
                                {
                                BranchName = childVM.BranchName,
                                CityID = childVM.CityId,
                                VendorID = existingVendor.VendorID,
                                CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                                CreatedOn = DateTime.Now,
                                IsActive = 1,
                                IsDeleted = 0,
                                ContactPersonVendors = new List<ContactPersonVendor>()
                                };

                            // Add any contacts for the new branch.
                            if (childVM.ContactPersonVendorVMs != null)
                                {
                                foreach (var contactVM in childVM.ContactPersonVendorVMs)
                                    {
                                    var newContact = new ContactPersonVendor
                                        {
                                        VendorID = existingVendor.VendorID,
                                        ContactPersonName = contactVM.ContactPersonName,
                                        Designation = contactVM.Designation,
                                        Address = contactVM.Address,
                                        PhoneNo = contactVM.PhoneNo,
                                        MobileNo = contactVM.MobileNo,
                                        Email = contactVM.Email,
                                        CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                                        CreatedOn = DateTime.Now,
                                        IsActive = 1,
                                        IsDeleted = 0
                                        };
                                    newChild.ContactPersonVendors.Add(newContact);
                                    }
                                }
                            existingVendor.VendorChilds.Add(newChild);
                            }
                        }
                    }

                // Capture the new state for logging.
                var newVendor = new
                    {
                    Vendor = new
                        {
                        existingVendor.VendorID,
                        existingVendor.VendorName,
                        existingVendor.CityID,
                        existingVendor.ContactNo,
                        existingVendor.Email,
                        existingVendor.Address,
                        existingVendor.NTNNo,
                        existingVendor.OpeningBalance,
                        existingVendor.CreditLimit,
                        existingVendor.CreditDays
                        },
                    VendorChilds = existingVendor.VendorChilds
                        .Where(child => child.IsDeleted==0)
                        .Select(child => new
                            {
                            child.VendorChildID,
                            child.BranchName,
                            child.CityID,
                            child.CreatedOn,
                            ContactPersons = child.ContactPersonVendors
                                .Where(cp => cp.IsDeleted == 0)
                                .Select(cp => new
                                    {
                                    cp.ContactPersonID,
                                    cp.ContactPersonName,
                                    cp.Designation,
                                    cp.Address,
                                    cp.PhoneNo,
                                    cp.MobileNo,
                                    cp.Email,
                                    cp.CreatedOn
                                    }).ToList()
                            }).ToList()
                    };

                // Create an activity log capturing the update.
                var activityLog = new ActivityLog
                    {
                    MenuItemId = 18,
                    ParentTableId = existingVendor.VendorID,
                    ActionType = "Update",
                    OldData = System.Text.Json.JsonSerializer.Serialize(oldVendor),
                    NewData = System.Text.Json.JsonSerializer.Serialize(newVendor),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                    };

                await _activityLogRepository.Create(activityLog);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(existingVendor);
                }
            catch (Exception ex)
                {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }



        // GET /api/Vendor/DetailVendorById/{id}
        // Returns a detailed view of a vendor, including branch offices and their contact persons,
        // after verifying the user has "View" permission on the Vendor menu.
        [HttpGet("DetailVendorById/{id}")]
        public async Task<IActionResult> DetailVendorById ( int id )
            {
            // 1️⃣ Permission check: ensure the current user can view vendor details
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Vendor", "Inventory System", "View"))
                return Forbid();  // HTTP 403 if the user lacks the required permission

            try
                {
                // 2️⃣ Load the Vendor entity, filtering to active and not-deleted records,
                //    and eager-load its child branches and each branch’s contact persons.
                var vendor = await _context.Vendors
                    .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                    .Include(c => c.VendorChilds)
                        .ThenInclude(child => child.ContactPersonVendors)
                    .FirstOrDefaultAsync(c => c.VendorID == id);

                // 2.a) If no matching vendor is found, return 404 Not Found
                if (vendor == null)
                    return NotFound();

                // 3️⃣ Map the EF entity into an anonymous detail view model, including lookups for related names
                var vendorDetail = new
                    {
                    // --- Vendor header information ---
                    VendorID = vendor.VendorID,
                    VendorName = vendor.VendorName,
                    // ▶ Lookup the city name for the vendor’s primary location
                    CityName = _context.Cities
                                          .Where(city => city.CityId == vendor.CityID)
                                          .Select(city => city.CityName)
                                          .FirstOrDefault(),
                    ContactNo = vendor.ContactNo,
                    Email = vendor.Email,
                    Address = vendor.Address,
                    NTNNo = vendor.NTNNo,
                    OpeningBalance = vendor.OpeningBalance,
                    CreditLimit = vendor.CreditLimit,
                    CreditDays = vendor.CreditDays,
                    // ▶ Format the creation date as 'dd-MMM-yyyy' lower-case
                    date = vendor.CreatedOn.HasValue
                                        ? vendor.CreatedOn.Value.ToString("dd-MMM-yyyy").ToLower()
                                        : string.Empty,

                    // --- Branch office details ---
                    VendorChildDetails = vendor.VendorChilds
                        .Where(child => child.IsActive == 1 && child.IsDeleted == 0)  // active branches only
                        .Select(child => new
                            {
                            child.VendorChildID,
                            BranchName = child.BranchName,
                            // ▶ Lookup the city name for this branch
                            CityName = _context.Cities
                                            .Where(city => city.CityId == child.CityID)
                                            .Select(city => city.CityName)
                                            .FirstOrDefault(),
                            child.VendorID,

                            // --- Contact persons for each branch ---
                            ContactPersonVendorDetails = child.ContactPersonVendors
                                .Where(cp => cp.IsActive == 1 && cp.IsDeleted == 0)      // only active contacts
                                .Select(cp => new
                                    {
                                    cp.ContactPersonID,
                                    cp.VendorID,
                                    cp.VendorChildID,
                                    cp.ContactPersonName,
                                    cp.Designation,
                                    cp.Address,
                                    cp.PhoneNo,
                                    cp.MobileNo,
                                    cp.Email
                                    })
                                .ToList()
                            })
                        .ToList(),
                    };

                // 4️⃣ Return HTTP 200 OK with the assembled detail object
                return Ok(vendorDetail);
                }
            catch (Exception ex)
                {
                // 5️⃣ On any error (e.g., database issues), return HTTP 500 with the exception message
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // DELETE /api/Vendor/{id}
        // Soft-deletes a vendor and all its related branches & contacts,
        // after verifying the user has "Delete" permission on the Vendor menu.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVendor ( int id )
            {
            // 1️⃣ Permission check: ensure current user can delete vendors
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Vendor", "Inventory System", "Delete"))
                return Forbid();  // HTTP 403 if unauthorized

            try
                {
                // 2️⃣ Load the vendor, including its branches and each branch's contact persons
                //    • Only active, non-deleted vendors
                var vendor = await _context.Vendors
                    .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                    .Include(c => c.VendorChilds)
                        .ThenInclude(child => child.ContactPersonVendors)
                    .FirstOrDefaultAsync(c => c.VendorID == id);

                // 2.a) If not found, return 404 Not Found
                if (vendor == null)
                    return NotFound("Vendor not found");

                // 3️⃣ Perform a soft delete by marking the vendor record as deleted
                //    • Related branches and contacts remain in the database—
                //      you could cascade or mark them deleted similarly if needed.
                vendor.IsDeleted = 1;

                // 4️⃣ Persist only the vendor change
                _context.Vendors.Update(vendor);
                await _context.SaveChangesAsync();

                // 5️⃣ Return HTTP 200 OK with a confirmation message
                return Ok("Vendor deleted successfully");
                }
            catch (Exception ex)
                {
                // 6️⃣ On unexpected error, return HTTP 500 with error details
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/Vendor/activity_log/vendor/{id}
        // Retrieves the audit log entries for a specific vendor (MenuItemId = 18),
        // including the action type, old/new data, vendor name, user who performed the action, and timestamp.
        [HttpGet("activity_log/vendor/{id}")]
        public async Task<IActionResult> GetActivityLogsForVendors ( int id )
            {
            try
                {
                // 1️⃣ Start from the ActivityLogs table, filtering to only entries for the Vendor menu (MenuItemId = 18)
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 18)

                    // 2️⃣ LEFT JOIN to Users to fetch the username associated with each log entry
                    .GroupJoin(
                        _context.Users,
                        log => log.UserId,   // key in ActivityLogs
                        user => user.Id,      // key in Users
                        ( log, users ) => new { log, users }
                    )
                    .SelectMany(
                        temp => temp.users.DefaultIfEmpty(),      // include logs even if user record is missing
                        ( temp, user ) => new { temp.log, user }
                    )

                    // 3️⃣ LEFT JOIN to Vendors to associate each log entry with its vendor record
                    .GroupJoin(
                        _context.Vendors,
                        temp => temp.log.ParentTableId,       // ParentTableId holds the VendorID
                        vend => vend.VendorID,                // primary key in Vendors
                        ( temp, vendors ) => new { temp.log, temp.user, vendors }
                    )
                    .SelectMany(
                        temp => temp.vendors.DefaultIfEmpty(),// include logs even if vendor record is missing
                        ( temp, vendor ) => new { temp.log, temp.user, vendor }
                    )

                    // 4️⃣ Filter to only the entries for the requested VendorID
                    .Where(x => x.vendor != null && x.vendor.VendorID == id)

                    // 5️⃣ Project the combined data into a DTO shape for the client
                    .Select(x => new
                        {
                        x.log.ActionType,                         // e.g. "Create", "Update", "Delete"
                        x.log.OldData,                            // JSON of the previous state
                        x.log.NewData,                            // JSON of the updated state
                        VendorName = x.vendor.VendorName,         // the vendor’s name for context
                        UserName = x.user != null
                                      ? x.user.UserName           // the username who performed the action
                                      : null,
                        x.log.Date                                 // timestamp of the action
                        })
                    .ToListAsync();                               // execute the full query asynchronously

                // 6️⃣ Return HTTP 200 OK with the list of audit entries
                return Ok(logs);
                }
            catch (Exception ex)
                {
                // 7️⃣ On any error, return HTTP 500 with a descriptive message
                return StatusCode(500, "An error occurred while retrieving activity logs: " + ex.Message);
                }
            }

        #region Fetch Data for DropDown


        // GET /api/Vendor/get-cities
        // Returns the complete list of cities (ID + Name) for dropdowns or lookups.
        [HttpGet("get-cities")]
        public async Task<IActionResult> GetAllCities ( )
            {
            try
                {
                // 1️⃣ Query the Cities table:
                //    • Select all rows, regardless of active/deleted flags, since cities are master data.
                //    • Project each row into an anonymous type containing only the fields needed by the client.
                var cities = await _context.Cities
                    .Select(c => new
                        {
                        c.CityId,    // primary key of the city
                        c.CityName   // human-readable city name
                        })
                    .ToListAsync();  // execute the query and materialize the list

                // 2️⃣ Return HTTP 200 OK along with the list of cities
                return Ok(cities);
                }
            catch (Exception ex)
                {
                // 3️⃣ If any exception occurs (e.g., database error),
                //    return HTTP 500 with the exception message to aid debugging.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        #endregion

        private async Task<string> GetUserRoleIdAsync()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                // Return null if the user is not authenticated.
                return null;
            }

            var userRole = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .FirstOrDefaultAsync();

            return userRole;
        }
    }
}
