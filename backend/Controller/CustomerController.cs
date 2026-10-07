using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using System.Globalization;
using System.Security.Claims;
using System.Threading.Channels;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CustomerController : ControllerBase
    {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;

        public CustomerController(InventoryDbContext context,PermissionService permissionService, ActivityLogRepository activityLogRepository)
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            }

        [HttpGet]
        public async Task<IActionResult> GetAllCustomers()
        {
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Customer", "Inventory System", "View"))
                return Forbid();

            try
            {
                var customers = (await _context.Customers
                    .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                    .GroupJoin(
                        _context.CustomerCategories.Where(cc => cc.IsActive == 1 && cc.IsDeleted == 0),
                        c => c.CustomerCategoryId,
                        cc => cc.CustomerCategoryId,
                        (c, ccGroup) => new { c, ccGroup }
                    )
                    .SelectMany(
                        x => x.ccGroup.DefaultIfEmpty(),
                        (x, cc) => new
                        {
                            x.c.CustomerId,
                            x.c.CustomerName,
                            x.c.Email,
                            x.c.ContactNo,
                            CustomerCategoryName = cc != null ? cc.CustomerCategoryName : null
                        }
                    )
                    .ToListAsync()).Select((customer, index) => new
                    {
                        Index = index + 1,
                        customer.CustomerId,
                        customer.CustomerName,
                        customer.Email,
                        customer.ContactNo,
                        customer.CustomerCategoryName

                    }).ToList();

                return Ok(customers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }




        [HttpPost("AddCustomer")]
        public async Task<IActionResult> AddCustomer([FromBody] CustomerRequest customerRequest)
            {
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Customer", "Inventory System", "Insert"))
                return Forbid();

            if (customerRequest == null)
                return BadRequest("Customer data is null");

            var checkCustomerName = await _context.Customers
              .FirstOrDefaultAsync(i => i.CustomerName.Trim() == customerRequest.CustomerName.Trim());
            if (checkCustomerName != null)
                return BadRequest(new { Succeeded = false, Message = "Customer Name already exists." });

            // Begin a transaction to ensure atomicity.
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
                {
                // 1. Save the Customer entity.
                var customer = new Customer
                    {
                    CustomerName = customerRequest.CustomerName,
                    CityID = customerRequest.CityID,
                    ContactNo = customerRequest.ContactNo,
                    Email = customerRequest.Email,
                    Address = customerRequest.Address,
                    NTNNo = customerRequest.NTNNo,
                    OpeningBalance = customerRequest.OpeningBalance,
                    CreditLimit = customerRequest.CreditLimit,
                    CreditDays = customerRequest.CreditDays,
                    CustomerCategory = customerRequest.CustomerCategory,
                    CustomerCategoryId = customerRequest.CustomerCategoryId,
                    CreatedOn = DateTime.Now,
                    CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    IsActive = 1,
                    IsDeleted = 0
                    };

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync(); // CustomerId is generated here.

                // Prepare collections to capture inserted child data.
                var insertedCustomerChilds = new List<CustomerChild>();
                var insertedContactPersons = new List<ContactPersonCustomer>();

                // 2. For each CustomerChildRequest, save the CustomerChild entity.
                if (customerRequest.customerChildRequests != null)
                    {
                    foreach (var childRequest in customerRequest.customerChildRequests)
                        {
                        var customerChild = new CustomerChild
                            {
                            BranchName = childRequest.BranchName,
                            CustomerId = customer.CustomerId, // assign generated CustomerId
                            CityID = childRequest.CityID,
                            CreatedOn = DateTime.Now,
                            CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                            IsActive = 1,
                            IsDeleted = 0
                            };

                        _context.CustomerChilds.Add(customerChild);
                        await _context.SaveChangesAsync(); // CustomerChildId generated.
                        insertedCustomerChilds.Add(customerChild);

                        // 3. For each ContactPersonCustomerRequest, save the ContactPersonCustomer entity.
                        if (childRequest.contactPersonCustomerRequests != null)
                            {
                            foreach (var contactRequest in childRequest.contactPersonCustomerRequests)
                                {
                                var contactPerson = new ContactPersonCustomer
                                    {
                                    CustomerId = customer.CustomerId,
                                    CustomerChildId = customerChild.CustomerChildId, // assign generated CustomerChildId
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

                                _context.ContactPersonCustomers.Add(contactPerson);
                                insertedContactPersons.Add(contactPerson);
                                }
                            await _context.SaveChangesAsync();
                            }
                        }
                    }

                // Build a log object capturing all the inserted customer data.
                var logCustomer = new
                    {
                    Customer = new
                        {
                        customer.CustomerId,
                        customer.CustomerName,
                        customer.CityID,
                        customer.ContactNo,
                        customer.Email,
                        customer.Address,
                        customer.NTNNo,
                        customer.OpeningBalance,
                        customer.CreditLimit,
                        customer.CreditDays,
                        
                        customer.CustomerCategoryId,
                        customer.CreatedOn
                        },
                    CustomerChilds = insertedCustomerChilds.Select(child => new
                        {
                        child.CustomerChildId,
                        child.BranchName,
                        child.CityID,
                        child.CreatedOn,
                        // Include related contact persons for each customer child.
                        ContactPersons = insertedContactPersons
                            .Where(cp => cp.CustomerChildId == child.CustomerChildId)
                            .Select(cp => new
                                {
                                cp.ContactPersonId, 
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
                    MenuItemId = 19,
                    ParentTableId = customer.CustomerId,
                    ActionType = "Create",
                    OldData = "",
                    NewData = System.Text.Json.JsonSerializer.Serialize(logCustomer),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                    };

                await _activityLogRepository.Create(activityLog);

                // Commit the transaction.
                await transaction.CommitAsync();
                return Ok(customer);
                }
            catch (Exception ex)
                {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }



        [HttpGet("GetCustomerById/{id}")]
        public async Task<IActionResult> GetCustomerById(int id)
        {
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Customer", "Inventory System", "Update"))
                return Forbid();

            try
            {
                // Retrieve the customer along with its child branches and contacts.
                var customer = await _context.Customers
                    .Where(c=>c.IsActive==1 && c.IsDeleted==0)
                    .Include(c => c.CustomerChilds)
                        .ThenInclude(child => child.ContactPersons)
                    .FirstOrDefaultAsync(c => c.CustomerId == id);

                if (customer == null)
                {
                    return NotFound();
                }

                // Map the database model to the view model.
                var customerVM = new CustomerVM
                {
                    CustomerId = customer.CustomerId,
                    CustomerName = customer.CustomerName,
                    CityID = customer.CityID,
                    ContactNo = customer.ContactNo,
                    Email = customer.Email,
                    Address = customer.Address,
                    NTNNo = customer.NTNNo,
                    OpeningBalance = customer.OpeningBalance,
                    CreditLimit = customer.CreditLimit,
                    CreditDays = customer.CreditDays,
                    CustomerCategory = customer.CustomerCategory,
                    CustomerCategoryId = customer.CustomerCategoryId,
                    CustomerChildVMs = customer.CustomerChilds.Where(c=>c.IsDeleted==0 && c.IsActive==1).Select(child => new CustomerChildVM
                    {
                        CustomerChildId = child.CustomerChildId,
                        BranchName = child.BranchName,
                        CityID=child.CityID,
                        CustomerId = child.CustomerId,
                        contactPersonCustomerVMs = child.ContactPersons.Where(c => c.IsDeleted == 0 && c.IsActive == 1).Select(cp => new ContactPersonCustomerVM
                        {
                            ContactPersonId = cp.ContactPersonId,
                            CustomerId = cp.CustomerId,
                            CustomerChildId = cp.CustomerChildId,
                            ContactPersonName = cp.ContactPersonName,
                            Designation = cp.Designation,
                            Address = cp.Address,
                            PhoneNo = cp.PhoneNo,
                            MobileNo = cp.MobileNo,
                            Email = cp.Email,
                        }).ToList()
                    }).ToList(),
                    RemovedCustomerChildIds = new List<int>()
                };

                return Ok(customerVM);
            }
            catch (System.Exception ex)
            {
                // Log the exception here if needed.
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        [HttpGet("detailCustomerById/{id}")]
        public async Task<IActionResult> DetailCustomerById(int id)
            {
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Customer", "Inventory System", "View"))
                return Forbid();

            try
                {
                // Retrieve the customer along with its child branches and contacts.
                var customer = await _context.Customers
                    .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                    .Include(c => c.CustomerChilds)
                        .ThenInclude(child => child.ContactPersons)
                    .FirstOrDefaultAsync(c => c.CustomerId == id);

                if (customer == null)
                    {
                    return NotFound();
                    }

                // Map the database model to the view model.
                var customerVM = new
                    {
                    CustomerId = customer.CustomerId,
                    CustomerName = customer.CustomerName,
                    CityName = _context.Cities.Where(c => c.CityId == customer.CityID).Select(c => c.CityName).FirstOrDefault(),
                    ContactNo = customer.ContactNo,
                    Email = customer.Email,
                    Address = customer.Address,
                    NTNNo = customer.NTNNo,
                    OpeningBalance = customer.OpeningBalance,
                    CreditLimit = customer.CreditLimit,
                    CreditDays = customer.CreditDays,
                    date = customer.CreatedOn.HasValue ? customer.CreatedOn.Value.ToString("dd-MMM-yyyy").ToLower() : string.Empty,
                    CustomerCategoryName = _context.CustomerCategories.Where(c => c.CustomerCategoryId == customer.CustomerCategoryId).Select(c => c.CustomerCategoryName).FirstOrDefault(),
                    CustomerChildDetails = customer.CustomerChilds.Where(c => c.IsDeleted == 0 && c.IsActive == 1).Select(child => new 
                        {
                        CustomerChildId = child.CustomerChildId,
                        BranchName = child.BranchName,
                        CityID = child.CityID,
                        CityName = _context.Cities.Where(c => c.CityId == child.CityID).Select(c => c.CityName).FirstOrDefault(),
                        contactPersonCustomerDetails = child.ContactPersons.Where(c => c.IsDeleted == 0 && c.IsActive == 1).Select(cp => new 
                            {
                            ContactPersonId = cp.ContactPersonId,
                            CustomerId = cp.CustomerId,
                            CustomerChildId = cp.CustomerChildId,
                            ContactPersonName = cp.ContactPersonName,
                            Designation = cp.Designation,
                            Address = cp.Address,
                            PhoneNo = cp.PhoneNo,
                            MobileNo = cp.MobileNo,
                            Email = cp.Email,
                            }).ToList()
                        }).ToList(),
                    
                    };

                return Ok(customerVM);
                }
            catch (System.Exception ex)
                {
                // Log the exception here if needed.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Customer", "Inventory System", "Delete"))
                return Forbid();

            try
            {
                var customer = await _context.Customers
                      .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                    .Include(c => c.CustomerChilds)
                    .ThenInclude(cc => cc.ContactPersons)
                    .FirstOrDefaultAsync(c => c.CustomerId == id);


                customer.IsDeleted = 1;
                // Remove the customer
                _context.Customers.Update(customer);

                await _context.SaveChangesAsync();
                return Ok("Customer deleted successfully");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("UpdateCustomer/{id}")]
        public async Task<IActionResult> UpdateCustomer(int id, [FromBody] CustomerVM customerVM)
            {
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Customer", "Inventory System", "Update"))
                return Forbid();

            if (id != customerVM.CustomerId)
                return BadRequest("Customer ID mismatch");

            // Begin a transaction.
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
                {
                // Retrieve the existing customer along with its child branches and contacts.
                var existingCustomer = await _context.Customers
                    .Include(c => c.CustomerChilds)
                        .ThenInclude(child => child.ContactPersons)
                    .FirstOrDefaultAsync(c => c.CustomerId == id);

                if (existingCustomer == null)
                    return NotFound();

                // Capture the old state for logging.
                var oldCustomer = new
                    {
                    Customer = new
                        {
                        existingCustomer.CustomerId,
                        existingCustomer.CustomerName,
                        existingCustomer.CityID,
                        existingCustomer.ContactNo,
                        existingCustomer.Email,
                        existingCustomer.Address,
                        existingCustomer.NTNNo,
                        existingCustomer.OpeningBalance,
                        existingCustomer.CreditLimit,
                        existingCustomer.CreditDays,
                       
                        existingCustomer.CustomerCategoryId,
                        existingCustomer.CreatedOn
                        },
                    CustomerChilds = existingCustomer.CustomerChilds
                        .Where(child => child.IsDeleted == 0)
                        .Select(child => new
                            {
                            child.CustomerChildId,
                            child.BranchName,
                            child.CityID,
                            child.CreatedOn,
                            ContactPersons = child.ContactPersons
                                .Where(cp => cp.IsDeleted == 0)
                                .Select(cp => new
                                    {
                                    cp.ContactPersonId,
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

                // Update main customer fields.
                existingCustomer.CustomerName = customerVM.CustomerName;
                existingCustomer.CityID = customerVM.CityID;
                existingCustomer.ContactNo = customerVM.ContactNo;
                existingCustomer.Email = customerVM.Email;
                existingCustomer.Address = customerVM.Address;
                existingCustomer.NTNNo = customerVM.NTNNo;
                existingCustomer.OpeningBalance = customerVM.OpeningBalance;
                existingCustomer.CreditLimit = customerVM.CreditLimit;
                existingCustomer.CreditDays = customerVM.CreditDays;
                existingCustomer.CustomerCategory = customerVM.CustomerCategory;
                existingCustomer.CustomerCategoryId = customerVM.CustomerCategoryId;
                existingCustomer.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                existingCustomer.ModifiedOn = DateTime.Now;

                // Mark removed customer branches as deleted.
                if (customerVM.RemovedCustomerChildIds != null && customerVM.RemovedCustomerChildIds.Any())
                    {
                    foreach (var removedChildId in customerVM.RemovedCustomerChildIds)
                        {
                        var childToMark = existingCustomer.CustomerChilds
                                            .FirstOrDefault(c => c.CustomerChildId == removedChildId);
                        if (childToMark != null)
                            {
                            childToMark.IsDeleted = 1;
                            childToMark.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                            childToMark.ModifiedOn = DateTime.Now;
                            }
                        }
                    }

                // Process each branch (CustomerChild).
                if (customerVM.CustomerChildVMs != null)
                    {
                    foreach (var childVM in customerVM.CustomerChildVMs)
                        {
                        // Check if branch already exists.
                        var existingChild = existingCustomer.CustomerChilds
                            .FirstOrDefault(c => c.CustomerChildId == childVM.CustomerChildId);

                        if (existingChild != null)
                            {
                            // Update branch fields.
                            existingChild.BranchName = childVM.BranchName;
                            existingChild.CityID = childVM.CityID;

                            // Mark removed contacts as deleted.
                            if (childVM.RemovedContactPersonIds != null && childVM.RemovedContactPersonIds.Any())
                                {
                                foreach (var removedContactId in childVM.RemovedContactPersonIds)
                                    {
                                    var contactToMark = existingChild.ContactPersons
                                                            .FirstOrDefault(cp => cp.ContactPersonId == removedContactId);
                                    if (contactToMark != null)
                                        {
                                        contactToMark.IsDeleted = 1;
                                        contactToMark.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                                        contactToMark.ModifiedOn = DateTime.Now;
                                        }
                                    }
                                }

                            // Process each contact for this branch.
                            if (childVM.contactPersonCustomerVMs != null)
                                {
                                foreach (var contactVM in childVM.contactPersonCustomerVMs)
                                    {
                                    var existingContact = existingChild.ContactPersons
                                        .FirstOrDefault(cp => cp.ContactPersonId == contactVM.ContactPersonId);
                                    if (existingContact != null)
                                        {
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
                                        // New contact to add.
                                        var newContact = new ContactPersonCustomer
                                            {
                                            CustomerId = existingCustomer.CustomerId,
                                            CustomerChildId = existingChild.CustomerChildId,
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
                                        existingChild.ContactPersons.Add(newContact);
                                        }
                                    }
                                }
                            }
                        else
                            {
                            // New branch to add.
                            var newChild = new CustomerChild
                                {
                                BranchName = childVM.BranchName,
                                CustomerId = existingCustomer.CustomerId,
                                CityID = childVM.CityID,
                                CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                                CreatedOn = DateTime.Now,
                                IsActive = 1,
                                IsDeleted = 0,
                                ContactPersons = new List<ContactPersonCustomer>()
                                };

                            // Add any contacts for the new branch.
                            if (childVM.contactPersonCustomerVMs != null)
                                {
                                foreach (var contactVM in childVM.contactPersonCustomerVMs)
                                    {
                                    var newContact = new ContactPersonCustomer
                                        {
                                        CustomerId = existingCustomer.CustomerId,
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
                                    newChild.ContactPersons.Add(newContact);
                                    }
                                }

                            existingCustomer.CustomerChilds.Add(newChild);
                            }
                        }
                    }

                // Capture the new state after modifications.
                var newCustomer = new
                    {
                    Customer = new
                        {
                        existingCustomer.CustomerId,
                        existingCustomer.CustomerName,
                        existingCustomer.CityID,
                        existingCustomer.ContactNo,
                        existingCustomer.Email,
                        existingCustomer.Address,
                        existingCustomer.NTNNo,
                        existingCustomer.OpeningBalance,
                        existingCustomer.CreditLimit,
                        existingCustomer.CreditDays,
                        
                        existingCustomer.CustomerCategoryId,
                        existingCustomer.CreatedOn
                        },
                    CustomerChilds = existingCustomer.CustomerChilds
                        .Where(child => child.IsDeleted == 0)
                        .Select(child => new
                            {
                            child.CustomerChildId,
                            child.BranchName,
                            child.CityID,
                            child.CreatedOn,
                            ContactPersons = child.ContactPersons
                                .Where(cp => cp.IsDeleted == 0)
                                .Select(cp => new
                                    {
                                    cp.ContactPersonId,
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
                    MenuItemId = 19,
                    ParentTableId = existingCustomer.CustomerId,
                    ActionType = "Update",
                    OldData = System.Text.Json.JsonSerializer.Serialize(oldCustomer),
                    NewData = System.Text.Json.JsonSerializer.Serialize(newCustomer),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                    };

                await _activityLogRepository.Create(activityLog);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(existingCustomer);
                }
            catch (Exception ex)
                {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        private async Task<string> GetUserRoleIdAsync()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return null; // User not authenticated
            }

            var userRole = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .FirstOrDefaultAsync();

            return userRole;
        }
        [HttpGet("activity_log/customer/{id}")]
        public async Task<IActionResult> GetActivityLogsForCustomers(int id)
            {
            try
                {
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 19)
                    // Left join with Users
                    .GroupJoin(
                        _context.Users,
                        a => a.UserId,
                        u => u.Id,
                        (a, users) => new { a, users }
                    )
                    .SelectMany(
                        temp => temp.users.DefaultIfEmpty(),
                        (temp, user) => new { temp.a, user }
                    )
                    // Left join with customers
                    .GroupJoin(
                        _context.Customers,
                        temp => temp.a.ParentTableId,
                        b => b.CustomerId,
                        (temp, customers) => new { temp.a, temp.user, customers }
                    )
                    .SelectMany(
                        temp => temp.customers.DefaultIfEmpty(),
                        (temp, customer) => new { temp.a, temp.user, customer }
                    )
                    // Apply filter for customerId = 1 (ensure customer is not null)
                    .Where(x => x.customer != null && x.customer.CustomerId == id)
                    // Project to the desired shape
                    .Select(x => new
                        {
                        x.a.ActionType,
                        x.a.OldData,
                        x.a.NewData,
                        CustomerName = x.customer.CustomerName,
                        UserName = x.user != null ? x.user.UserName : null,
                        x.a.Date
                        })
                    .ToListAsync();

                return Ok(logs);
                }
            catch (Exception ex)
                {
                // Optionally log the exception details
                return StatusCode(500, "An error occurred while retrieving activity logs: " + ex.Message);
                }
            }
        #region Fetch Data for DropDown
        [HttpGet("get-customerCategories")]
        public async Task<IActionResult> GetAllCustomerCategories()
        {
            try
            {
                var customerCategorys = await _context.CustomerCategories
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(c => new
                    {
                        c.CustomerCategoryId,
                        c.CustomerCategoryName

                    })
                    .ToListAsync();

                return Ok(customerCategorys);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("get-cities")]
        public async Task<IActionResult> GetAllCities()
        {
            try
            {
                var cities = await _context.Cities
                    .Select(c => new
                    {
                        c.CityId,
                        c.CityName,

                    })
                    .ToListAsync();

                return Ok(cities);


            }
            catch (Exception ex)
            {
                // Handle any errors that occur
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
        #endregion
    }



}
