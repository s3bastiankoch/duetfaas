clientInstanceName="empiris-duet-instance"
zone="europe-west3-c"

sut_ip="$(gcloud compute instances describe $clientInstanceName --zone=$zone --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"
echo "SUT IP is" $sut_ip

# Copy lambda to emulator
echo "Copying lambda to emulator.."
# Create a new directory on the emulator instance
gcloud compute ssh $clientInstanceName --zone $zone -- "mkdir -p serverless-ts"
gcloud compute scp --recurse $PWD/../../.faas-classic-a $clientInstanceName:~/serverless-ts --zone $zone >> /dev/null
gcloud compute scp --recurse $PWD/../../.faas-classic-b $clientInstanceName:~/serverless-ts --zone $zone >> /dev/null

