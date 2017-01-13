/**
 * This file is where the backup and restore operations are stored.
 * 
 */
var couchbackup = require('couchbackup');
var environment = require('./environment');		
var pkgcloud = require('pkgcloud');
var fs = require('fs');

/**
 * operations.backup()
 * 
 * This function performs the backup operation, first getting a .txt file of all documents
 * Then it will upload this fine to Object Storage with the date as the file name
 */
exports.backup = function(){
	
	console.log("Executing Cloudant Backup operation...");
	
    var opts, config;
    
    if (environment.VCAP_SERVICES["cloudantNoSQLDB"] || environment.VCAP_SERVICES["cloudantNoSQLDB Dedicated"]) 
    {
    	console.log("Using Bound Cloudant");
    	var vcapServices = environment.VCAP_SERVICES["cloudantNoSQLDB"] || environment.VCAP_SERVICES["cloudantNoSQLDB Dedicated"];
        credentials = vcapServices[0].credentials;

    	opts = {
   			   "COUCH_URL": credentials.url,
   			   "COUCH_DATABASE": environment.database_name,
       		   "COUCH_BUFFER_SIZE": 500
   			};
    } 
    else 
    {
    	console.log("Using Remote Cloudant");
    	opts = {
   			"COUCH_URL": environment.cloudant_url,
   			"COUCH_DATABASE": environment.database_name,
       		"COUCH_BUFFER_SIZE": 500
   			};
    } 

    const stagingfile = 'backup.txt';
	
	couchbackup.backupStream(fs.createWriteStream(stagingfile), opts, function(err, obj) 
	{	
		if (err)
		{
			console.log("Error backing up from Cloudant: ", err);
		} 
		else 
		{
			var config;
			//if bound - pull in values from Bluemix VCAP credentials
			if (environment.VCAP_SERVICES["Object-Storage"] || environment.VCAP_SERVICES["Object Storage Dedicated"])
			{
				
				console.log("Using Bound Object Storage");
				
				var vcapServices = environment.VCAP_SERVICES["Object-Storage"] || environment.VCAP_SERVICES["Object Storage Dedicated"];
		        credentials = vcapServices[0].credentials;
				
				config = {
					    provider: 'openstack',
					    useServiceCatalog: true,
					    useInternal: false,
					    keystoneAuthVersion: 'v3',
					    authUrl: credentials.auth_url,
					    tenantId: credentials.projectId,    //projectId from credentials
					    domainId: credentials.domainId,
					    username: credentials.username,
					    password: credentials.password,
					    region: credentials.region   //dallas or london region
					};
				
			//if remote - Pull in values from manifest
			} 
			else 
			{
				console.log("Using Remote Object Storage");
				
				config = {
					    provider: 'openstack',
					    useServiceCatalog: true,
					    useInternal: false,
					    keystoneAuthVersion: 'v3',
					    authUrl: environment.os_auth_url,
					    tenantId: environment.os_projectId,    //projectId from credentials
					    domainId: environment.os_domainId,
					    username: environment.os_username,
					    password: environment.os_password,
					    region: environment.os_region   //dallas or london region
					};
			}
	
			//Authenticate
			var storageClient = pkgcloud.storage.createClient(config);
	
			storageClient.auth(function(err) {
			    if (err) 
			    {
			        console.error(err);
			        console.log("Error Authenticating - be certain to have supplied the correct values in Manifest.yml or to have restaged the application after binding dependencies.");
			    }
			    else 
			    {
			        console.log(storageClient._identity);		    
			    }
			});
			
			//Upload file
			var fs = require('fs');
			var date = new Date();
			// name container after database
			var containerName = environment.database_name;
			// name backup file
			var fileName = date.toISOString().substring(0,16).replace(":","-") + ".json";
	
			storageClient.createContainer({
			    name: containerName
	
			    }, function (err, container) {
	
			        if (err) 
			        {
			            console.error(err);
			        } 
			        else 
			        {
			            var rStream = fs.createReadStream(stagingfile);
			            var upload = storageClient.upload({
			                container: container.name,
			                remote: fileName
			            });
	
			            upload.on('error', function(err) {
			                console.error(err);
			            });
	
			            upload.on('success', function(file) {
			                console.log(file.toJSON());
			                console.log("File uploaded successfully");
			            });
	
			            rStream.pipe(upload);
			        }
	        });
	    }
	});
};